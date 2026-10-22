/**
 * Supabase Edge Function : sync-chanteur-photo
 *
 * Source : public.chanteurs.photo_drive_url (lien Google Drive)
 * Cible  : Storage bucket prive "photos-chanteurs", chemin public.chanteurs.photo
 *
 * Authentification webhook : header apikey avec une cle Supabase secret.
 * Authentification Google : OAuth 2.0 via _shared/google-auth.ts.
 * Le refresh token utilise doit autoriser Google Drive. Il peut etre distinct de Gmail.
 *
 * Configuration dans supabase/config.toml :
 * [functions.sync-chanteur-photo]
 * verify_jwt = false
 */
import { withSupabase } from "npm:@supabase/server@1";
import { obtenirAccessToken } from "../_shared/google-auth.ts";

const TABLE = "chanteurs";
const BUCKET = "photos-chanteurs";
const MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type DriveFile = {
  id: string;
  mimeType?: string;
  size?: string;
  trashed?: boolean;
  capabilities?: { canDownload?: boolean };
};

type Chanteur = {
  id: string;
  photo_drive_url: string | null;
  photo_drive_id: string | null;
  photo: string | null;
  photo_sync_status: string | null;
  photo_sync_version: number;
};

function extractDriveFile(raw: string): { id: string; resourceKey: string | null } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("URL Google Drive invalide");
  }

  if (url.protocol !== "https:") {
    throw new Error("Seules les URL HTTPS sont acceptees");
  }

  let id: string | null = null;

  if (url.hostname === "drive.google.com") {
    // https://drive.google.com/file/d/ID/view
    // https://drive.google.com/thumbnail?id=ID&sz=w400
    // https://drive.google.com/open?id=ID
    id = url.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      ?? url.searchParams.get("id");
  } else if (url.hostname === "lh3.googleusercontent.com") {
    // https://lh3.googleusercontent.com/d/ID=w1600
    id = url.pathname.match(/^\/d\/([a-zA-Z0-9_-]+)(?:=|$)/)?.[1] ?? null;
  } else {
    throw new Error("L'URL doit provenir de Google Drive");
  }

  if (!id || !/^[a-zA-Z0-9_-]{10,}$/.test(id)) {
    throw new Error("Identifiant du fichier Google Drive introuvable");
  }

  const resourceKey = url.searchParams.get("resourcekey")
    ?? url.searchParams.get("resourceKey");

  return { id, resourceKey };
}

async function downloadDriveImage(
  id: string,
  resourceKey: string | null,
): Promise<{ image: Blob; extension: string }> {
  const accessToken = await obtenirAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (resourceKey) {
    headers["X-Goog-Drive-Resource-Keys"] = `${id}/${resourceKey}`;
  }

  const metadataUrl = new URL(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`,
  );
  metadataUrl.searchParams.set(
    "fields",
    "id,mimeType,size,trashed,capabilities(canDownload)",
  );

  const metadataResponse = await fetch(metadataUrl, {
    headers,
    signal: AbortSignal.timeout(20_000),
  });
  if (!metadataResponse.ok) {
    throw new Error(
      `Lecture Google Drive impossible (HTTP ${metadataResponse.status}). ` +
      "Verifier les autorisations OAuth Drive et l acces au fichier.",
    );
  }
  const metadata = (await metadataResponse.json()) as DriveFile;
  const mime = (metadata.mimeType ?? "").toLowerCase();
  const extension = IMAGE_EXTENSIONS[mime];
  if (metadata.trashed) throw new Error("Le fichier Drive est dans la corbeille");
  if (metadata.capabilities?.canDownload === false) {
    throw new Error("Le telechargement est interdit pour ce fichier Drive");
  }
  if (!extension) throw new Error(`Format non pris en charge : ${mime || "inconnu"}`);
  if (metadata.size && Number(metadata.size) > MAX_BYTES) {
    throw new Error("Photo trop volumineuse (maximum 10 Mo)");
  }

  const mediaUrl = new URL(metadataUrl);
  mediaUrl.search = "";
  mediaUrl.searchParams.set("alt", "media");
  const response = await fetch(mediaUrl, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Telechargement Google Drive impossible (HTTP ${response.status})`);
  }

  // Lecture par morceaux pour ne jamais accepter une reponse > 10 Mo.
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Google Drive n'a renvoye aucun contenu");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Photo trop volumineuse (maximum 10 Mo)");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (length === 0) throw new Error("Le fichier Drive est vide");

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { image: new Blob([bytes], { type: mime }), extension };
}

function isOwnedStoragePath(path: string | null, chanteurId: string): path is string {
  return typeof path === "string" &&
    path.startsWith(`chanteurs/${chanteurId}/`);
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Methode non autorisee" }, { status: 405 });
    }

    const event = await req.json();
    if (
      event?.schema !== "public" || event?.table !== TABLE ||
      !["INSERT", "UPDATE"].includes(event?.type) || !event?.record?.id
    ) {
      return Response.json({ skipped: "evenement sans rapport" });
    }

    // Le webhook recoit aussi les UPDATE realises par cette fonction.
    // Ne traiter que le changement d'URL ou l'increment de version (relance).
    if (
      event.type === "UPDATE" &&
      event.record.photo_drive_url === event.old_record?.photo_drive_url &&
      event.record.photo_sync_version === event.old_record?.photo_sync_version
    ) {
      return Response.json({ skipped: "URL et version inchangees" });
    }

    const db = ctx.supabaseAdmin;
    const { data: row, error: readError } = await db
      .from(TABLE)
      .select(
        "id,photo_drive_url,photo_drive_id,photo,photo_sync_status,photo_sync_version",
      )
      .eq("id", event.record.id)
      .maybeSingle();

    if (readError) throw readError;
    if (!row) return Response.json({ skipped: "chanteur introuvable" });

    const chanteur = row as Chanteur;
    const version = chanteur.photo_sync_version;
    const oldPath = chanteur.photo;
    const sourceUrl = chanteur.photo_drive_url;

    if (
      chanteur.photo_sync_status !== "pending" ||
      version !== event.record.photo_sync_version ||
      sourceUrl !== event.record.photo_drive_url
    ) {
      return Response.json({ skipped: "synchronisation deja traitee ou obsolete" });
    }

    // Compare-and-swap : aucune reponse ancienne ne peut remplacer une photo recente.
    function guardedUpdate(values: Record<string, unknown>) {
      let query = db.from(TABLE)
        .update(values)
        .eq("id", chanteur.id)
        .eq("photo_sync_version", version)
        .eq("photo_sync_status", "pending");

      query = sourceUrl === null
        ? query.is("photo_drive_url", null)
        : query.eq("photo_drive_url", sourceUrl);

      query = oldPath === null
        ? query.is("photo", null)
        : query.eq("photo", oldPath);

      return query.select("id").maybeSingle();
    }

    async function deleteOwnedFile(path: string | null) {
      if (!isOwnedStoragePath(path, chanteur.id)) return;
      const { error } = await db.storage.from(BUCKET).remove([path]);
      if (error) console.error("Suppression Storage echouee:", error.message);
    }

    let uploadedPath: string | null = null;
    try {
      // Si l'administrateur efface l'URL, retirer la photo geree par Drive.
      if (!sourceUrl?.trim()) {
        // Ne pas effacer une photo manuelle preexistante : nous ne gerons
        // automatiquement que les photos deja associees a un ID Drive.
        const wasImportedFromDrive = Boolean(chanteur.photo_drive_id);
        const { data: saved, error } = await guardedUpdate({
          photo: wasImportedFromDrive ? null : oldPath,
          photo_drive_id: null,
          photo_sync_status: null,
          photo_sync_error: null,
        });
        if (error) throw error;
        if (saved && wasImportedFromDrive) await deleteOwnedFile(oldPath);
        return Response.json({ success: Boolean(saved), removed: Boolean(saved) && wasImportedFromDrive });
      }

      const { id, resourceKey } = extractDriveFile(sourceUrl);

      // URL differente, mais identifiant de fichier identique : rien a importer.
      if (id === chanteur.photo_drive_id && oldPath) {
        const { data: saved, error } = await guardedUpdate({
          photo_sync_status: "ready",
          photo_sync_error: null,
        });
        if (error) throw error;
        return Response.json({ success: Boolean(saved), unchanged: true });
      }

      const { image, extension } = await downloadDriveImage(id, resourceKey);
      uploadedPath = `chanteurs/${chanteur.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await db.storage
        .from(BUCKET)
        .upload(uploadedPath, image, {
          contentType: image.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: saved, error: updateError } = await guardedUpdate({
        photo: uploadedPath,
        photo_drive_id: id,
        photo_sync_status: "ready",
        photo_sync_error: null,
      });
      if (updateError) throw updateError;

      if (!saved) {
        await deleteOwnedFile(uploadedPath);
        return Response.json({ skipped: "URL modifiee pendant l'import" });
      }

      await deleteOwnedFile(oldPath);
      console.log("Photo du chanteur synchronisee", chanteur.id, uploadedPath);
      return Response.json({ success: true, photo: uploadedPath });

    } catch (cause) {
      if (uploadedPath) await deleteOwnedFile(uploadedPath);
      const message = cause instanceof Error ? cause.message : String(cause);
      console.error("sync-chanteur-photo:", message);

      const { error: statusError } = await guardedUpdate({
        photo_sync_status: "error",
        photo_sync_error: message.slice(0, 500),
      });
      if (statusError) console.error("Echec enregistrement erreur:", statusError.message);
      return Response.json({ success: false, error: message }, { status: 500 });
    }
  }),
};
