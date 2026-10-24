// Supabase Edge Function : trombinoscope-saison
// Vérification JWT désactivée à la passerelle, mais CONTRÔLE OBLIGATOIRE ici.
// Ne transmettez jamais la clé de service au navigateur.

import { createClient } from "npm:@supabase/supabase-js@2.110.0";

const url = Deno.env.get("SUPABASE_URL");
const serverKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
if (!url || !serverKey) {
    throw new Error("Variables serveur Supabase manquantes.");
}

// Ce client ne reçoit jamais les headers de l'utilisateur :
// ses droits serveur ne sont donc pas remplacés par le JWT du demandeur.
const db = createClient(url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const origins = new Set(
    (Deno.env.get("TROMBI_ALLOWED_ORIGINS") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
);

// Même bucket privé que ChanteurPhoto.jsx ; aucun secret supplémentaire.
const PHOTO_BUCKET = "photos-chanteurs";
const SIGNED_URL_DURATION = 3600;

// La vue transmet photo_path (chemin Storage) ; l'API renvoie photo_url (URL signée).
// Une seule signature par chemin distinct, y compris chef et accompagnant.
async function ajouterPhotosSignees(donnees: {
    chanteurs: Record<string, unknown>[];
    chef: Record<string, unknown> | null;
    accompagnant: Record<string, unknown> | null;
}) {
    const personnes = [
        ...donnees.chanteurs,
        ...(donnees.chef ? [donnees.chef] : []),
        ...(donnees.accompagnant ? [donnees.accompagnant] : [])
    ];

    const cheminOuUrl = (personne: Record<string, unknown>) =>
        typeof personne.photo_path === "string" ? personne.photo_path : null;

    const chemins = [...new Set(personnes
        .map(cheminOuUrl)
        .filter((path): path is string => Boolean(path) && !/^https?:\/\//i.test(path)))];

    const urlParChemin = new Map<string, string>();

    // Supabase Storage accepte des listes de chemins pour limiter les appels.
    for (let i = 0; i < chemins.length; i += 100) {
        const lot = chemins.slice(i, i + 100);
        const { data, error } = await db.storage
            .from(PHOTO_BUCKET)
            .createSignedUrls(lot, SIGNED_URL_DURATION);

        if (error) {
            // Le trombi doit continuer à s'afficher même si Storage est indisponible.
            console.error("Signature des photos du trombinoscope :", error.message);
            continue;
        }
        for (const [index, item] of (data || []).entries()) {
            if (item?.signedUrl) {
                urlParChemin.set(item.path || lot[index], item.signedUrl);
            }
        }
    }

    const transformer = (personne: Record<string, unknown> | null) => {
        if (!personne) return null;
        const { photo_path, ...reste } = personne;
        const source = typeof photo_path === "string" ? photo_path : "";
        const photo_url = /^https?:\/\//i.test(source)
            ? source
            : urlParChemin.get(source) || null;
        return { ...reste, photo_url };
    };

    return {
        chanteurs: donnees.chanteurs.map(transformer),
        chef: transformer(donnees.chef),
        accompagnant: transformer(donnees.accompagnant)
    };
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function responseJson(req: Request, body: unknown, status = 200) {
    const origin = req.headers.get("origin");
    const headers: Record<string, string> = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Vary": "Origin"
    };
    if (origin && origins.has(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Headers"] =
            "authorization, apikey, x-client-info, content-type, x-chanteur-token";
        headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    }
    return new Response(JSON.stringify(body), { status, headers });
}

async function adminValide(req: Request): Promise<boolean> {
    const match = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
    const jwt = match?.[1];
    if (!jwt) return false;

    // getUser() valide réellement le JWT auprès de Supabase Auth.
    // Selon ton fonctionnement, tout compte Auth valide est administrateur.
    const { data, error } = await db.auth.getUser(jwt);
    return !error && Boolean(data.user?.id) && !data.user?.is_anonymous;
}

async function chanteurValide(req: Request, saisonId: string): Promise<boolean> {
    const token = req.headers.get("x-chanteur-token");
    if (!token) return false;

    // Aucun token n'est journalisé, stocké ni réémis.
    const { data, error } = await db.rpc("trombi_token_autorise", {
        p_token: token,
        p_saison_id: saisonId
    });
    if (error) throw error;
    return data === true;
}

Deno.serve(async (req: Request) => {
    const origin = req.headers.get("origin");
    if (origin && !origins.has(origin)) {
        return responseJson(req, { error: "Origine non autorisée." }, 403);
    }
    if (req.method === "OPTIONS") {
        const preflight = responseJson(req, { ok: true });
        return new Response(null, { status: 204, headers: preflight.headers });
    }
    if (req.method !== "POST") {
        return responseJson(req, { error: "Méthode non autorisée." }, 405);
    }

    try {
        let payload: { saisonId?: unknown };
        try {
            payload = await req.json();
        } catch {
            return responseJson(req, { error: "JSON invalide." }, 400);
        }
        const saisonId = payload?.saisonId;
        if (typeof saisonId !== "string" || !uuidRegex.test(saisonId)) {
            return responseJson(req, { error: "Identifiant de saison invalide." }, 400);
        }

        const autorise = await adminValide(req) || await chanteurValide(req, saisonId);
        if (!autorise) {
            return responseJson(req, { error: "Accès au trombinoscope refusé." }, 403);
        }

        const { data, error } = await db
            .from("vue_trombinoscope_saison")
            .select("saison_id,saison,groupes,chanteurs,chef,accompagnant")
            .eq("saison_id", saisonId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return responseJson(req, { error: "Saison introuvable." }, 404);

        // La vue renvoie des chemins Storage privés (photo_path).
        // Comme le faisait get-trombinoscope, signer côté serveur avant
        // d'envoyer photo_url au composant purement visuel.
        const photos = await ajouterPhotosSignees({
            chanteurs: Array.isArray(data.chanteurs) ? data.chanteurs : [],
            chef: data.chef || null,
            accompagnant: data.accompagnant || null
        });

        return responseJson(req, {
            saison: data.saison,
            groupes: data.groupes || [],
            ...photos
        });
    } catch (error) {
        console.error("trombinoscope-saison :", error instanceof Error ? error.message : error);
        return responseJson(req, { error: "Erreur serveur du trombinoscope." }, 500);
    }
});
