import { createSupabaseAdmin, validateChanteurToken } from "../_shared/chanteur.ts";
import { readStorageCacheConfig } from "../_shared/storage-cache.ts";
import { autoriserEnvoiPush } from "../push-test/PushAuthorizationService.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
};
const respond = (status: number, body: unknown) => Response.json(body, { status, headers: corsHeaders });

Deno.serve(async (request: Request) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST") return respond(405, { error: "Méthode non autorisée." });
    try {
        let body;
        try { body = await request.json(); } catch { return respond(400, { error: "JSON invalide." }); }
        if (!body || typeof body !== "object" || Array.isArray(body)) return respond(400, { error: "JSON invalide." });
        if (body.action !== undefined && body.action !== "read" && body.action !== "refresh") {
            return respond(400, { error: "Action inconnue." });
        }
        const db = createSupabaseAdmin();
        let canRefresh = false;
        if (body.action === "refresh") {
            if (!["photos_choristes", "pdf_dai"].includes(body.code)) {
                return respond(400, { error: "Catégorie de cache inconnue." });
            }
            // Reuse the existing verified Auth UID allowlist, but NEVER accept
            // PUSH_TEST_SECRET for cache administration (JWT only).
            const headers = new Headers(request.headers);
            headers.delete("x-push-test-secret");
            const auth = await autoriserEnvoiPush(new Request(request.url, { headers }));
            if (!auth.autorise) return respond(auth.status, { error: auth.message });
            canRefresh = true;
            const { error } = await db.rpc("increment_storage_cache_version", { p_code: body.code });
            if (error) throw error;
        } else {
            const jwt = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
            let authenticated = false;
            if (jwt) {
                const { data, error } = await db.auth.getUser(jwt);
                authenticated = !error && Boolean(data.user?.id) && !data.user?.is_anonymous;
                canRefresh = authenticated && (Deno.env.get("PUSH_ADMIN_USER_IDS") ?? "")
                    .split(",").some(id => id.trim().toLowerCase() === data.user?.id.toLowerCase());
            }
            if (!authenticated) {
                if (typeof body.token !== "string" || !body.token.trim()) {
                    return respond(401, { error: "Authentification nécessaire." });
                }
                const { error, status } = await validateChanteurToken(db, body.token);
                if (error) return respond(status === 400 ? 401 : status, { error: "Accès au cache refusé." });
            }
        }
        return respond(200, { config: await readStorageCacheConfig(db), can_refresh: canRefresh });
    } catch (error) {
        console.error("storage-cache-config:", error instanceof Error ? error.message : "Erreur serveur");
        return respond(503, { error: "Configuration du cache Storage indisponible." });
    }
});
