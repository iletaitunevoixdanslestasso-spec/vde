import { createSupabaseAdmin } from "./chanteur.ts";

const MESSAGE_FIELDS = "id,titre,contenu,auteur_nom,created_at";
const HISTORY_FIELDS = `${MESSAGE_FIELDS},saison_id,statut_push,nombre_chanteurs,nombre_appareils,nombre_sans_abonnement,acceptes,echecs`;

export interface NotificationHistory {
  id: string;
  saison_id: string;
  titre: string;
  contenu: string;
  auteur_id: string | null;
  auteur_nom: string;
  created_at: string;
  statut_push: "en_cours" | "termine" | "partiel" | "erreur";
  nombre_chanteurs: number;
  nombre_appareils: number;
  nombre_sans_abonnement: number;
  acceptes: number;
  echecs: number;
}

export interface NotificationPublication {
  id: string;
  saisonId: string;
  titre: string;
  contenu: string;
  auteur: { id: string | null; nom: string };
  chanteurIds: string[];
  nombreAppareils: number;
  nombreSansAbonnement: number;
}

export class NotificationHistoryError extends Error {
  status: 400 | 409;
  constructor(message: string, status: 400 | 409) {
    super(message);
    this.status = status;
    this.name = "NotificationHistoryError";
  }
}

/** Accès serveur seulement : aucun identifiant chanteur n'est fourni directement par le navigateur. */
export class NotificationMessagesRepository {
  private db;
  constructor(db = createSupabaseAdmin()) { this.db = db; }

  // Ce premier contrôle permet de retrouver un envoi terminé même si la saison
  // ou les abonnements ont changé. Le RPC refait le contrôle atomiquement.
  async findExisting(publication: Omit<NotificationPublication, "nombreAppareils" | "nombreSansAbonnement">): Promise<NotificationHistory | null> {
    const { data, error } = await this.db.from("notification_messages")
      .select(`${HISTORY_FIELDS},auteur_id`).eq("id", publication.id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const existingIds: string[] = [];
    let offset = 0;
    while (true) {
      const { data: recipients, count, error: recipientError } = await this.db.from("notification_destinataires")
        .select("chanteur_id", { count: "exact" }).eq("notification_id", publication.id)
        .order("chanteur_id").range(offset, offset + 99);
      if (recipientError) throw recipientError;
      if (count === null) throw new Error("Comptage des destinataires indisponible.");
      for (const row of recipients ?? []) existingIds.push(row.chanteur_id);
      offset += recipients?.length ?? 0;
      if (offset >= count) break;
      if (!recipients?.length) throw new Error("Lecture incomplète des destinataires.");
    }
    const ids = [...new Set(publication.chanteurIds)].sort();
    existingIds.sort();
    if (data.saison_id !== publication.saisonId || data.titre !== publication.titre ||
      data.contenu !== publication.contenu || data.auteur_id !== publication.auteur.id ||
      JSON.stringify(ids) !== JSON.stringify(existingIds)) {
      throw new NotificationHistoryError("Cet identifiant d'envoi appartient déjà à un autre message ou à une autre sélection.", 409);
    }
    return data;
  }

  async create(publication: NotificationPublication): Promise<{ created: boolean; message: NotificationHistory }> {
    const { data, error } = await this.db.rpc("creer_notification_message", {
      p_id: publication.id, p_saison_id: publication.saisonId,
      p_titre: publication.titre, p_contenu: publication.contenu,
      p_auteur_id: publication.auteur.id, p_auteur_nom: publication.auteur.nom,
      p_chanteur_ids: publication.chanteurIds, p_nombre_appareils: publication.nombreAppareils,
      p_nombre_sans_abonnement: publication.nombreSansAbonnement,
    });
    if (error) {
      if (error.message?.includes("NOTIFICATION_CONFLICT")) {
        throw new NotificationHistoryError("Cet identifiant d'envoi appartient déjà à un autre message ou à une autre sélection.", 409);
      }
      if (error.message?.includes("NOTIFICATION_SEASON")) {
        throw new NotificationHistoryError("La saison active a changé. Rechargez la sélection.", 409);
      }
      if (error.message?.includes("NOTIFICATION_RECIPIENTS")) {
        throw new NotificationHistoryError("Au moins un chanteur ne fait plus partie de la saison active. Rechargez la sélection.", 400);
      }
      throw error;
    }
    if (!data?.message?.id || typeof data.created !== "boolean") throw new Error("Réponse d'archivage invalide.");
    return data;
  }

  async finish(id: string, acceptes: number, echecs: number) {
    const statut = echecs === 0 ? "termine" : acceptes > 0 ? "partiel" : "erreur";
    const { data, error } = await this.db.from("notification_messages")
      .update({ statut_push: statut, acceptes, echecs }).eq("id", id).eq("statut_push", "en_cours")
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Résultat Push non enregistré.");
  }

  async countUnread(chanteurId: string): Promise<number> {
    const { count, error } = await this.db.from("notification_destinataires")
      .select("notification_id", { count: "exact", head: true }).eq("chanteur_id", chanteurId).is("lu_le", null);
    if (error) throw error;
    return count ?? 0;
  }

  async listForSinger(chanteurId: string, page: number, pageSize: number) {
    const { data, count, error } = await this.db.from("notification_messages")
      .select(`${MESSAGE_FIELDS},notification_destinataires!inner(lu_le)`, { count: "exact" })
      .eq("notification_destinataires.chanteur_id", chanteurId)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    const messages = (data ?? []).map(({ notification_destinataires, ...message }) => ({
      ...message, lu_le: notification_destinataires?.[0]?.lu_le ?? null,
    }));
    return { messages, total: count ?? 0, non_lus: await this.countUnread(chanteurId), page, page_size: pageSize };
  }

  async setRead(chanteurId: string, notificationId: string, lu: boolean) {
    let query = this.db.from("notification_destinataires")
      .update({ lu_le: lu ? new Date().toISOString() : null })
      .eq("notification_id", notificationId).eq("chanteur_id", chanteurId);
    // Ne pas réécrire la première date de lecture à chaque ouverture.
    if (lu) query = query.is("lu_le", null);
    const { data, error } = await query.select("notification_id,lu_le").maybeSingle();
    if (error) throw error;
    if (data || !lu) return data;
    const { data: existing, error: existingError } = await this.db.from("notification_destinataires")
      .select("notification_id,lu_le").eq("notification_id", notificationId).eq("chanteur_id", chanteurId).maybeSingle();
    if (existingError) throw existingError;
    return existing;
  }

  async listAdmin(page: number, pageSize: number) {
    // Pas de liste nominative de destinataires, de clés Push, ni d'UID Auth.
    const { data, count, error } = await this.db.from("notification_messages")
      .select(HISTORY_FIELDS, { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    return { messages: data ?? [], total: count ?? 0, page, page_size: pageSize };
  }
}

export const notificationsCorsHeaders = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function notificationResponse(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, { status, headers: notificationsCorsHeaders });
}

export function notificationPagination(body: Record<string, unknown>) {
  const page = body.page ?? 0;
  const pageSize = body.page_size ?? 20;
  if (!Number.isInteger(page) || (page as number) < 0 || (page as number) > 1000000 ||
    !Number.isInteger(pageSize) || (pageSize as number) < 1 || (pageSize as number) > 50) return null;
  return { page: page as number, pageSize: pageSize as number };
}
