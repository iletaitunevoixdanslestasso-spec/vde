import { withSupabase } from "npm:@supabase/server@1";

const BUCKET = "photos-chanteurs";
const EXPIRATION = 3600;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store"
};

function reponseErreur(message: string, status: number) {
    return Response.json({ error: message }, { status, headers: corsHeaders });
}

export default {
    fetch: withSupabase(
        { auth: "none" },
        async (req, ctx) => {
            if (req.method === "OPTIONS") {
                return new Response(null, { headers: corsHeaders });
            }
            if (req.method !== "POST") {
                return reponseErreur("Méthode non autorisée", 405);
            }

            let token: string;
            try {
                ({ token } = await req.json());
            } catch {
                return reponseErreur("Corps de requête invalide", 400);
            }
            if (typeof token !== "string" || !token.trim()) {
                return reponseErreur("Token manquant", 401);
            }

            // Le RPC existant valide le token et sélectionne les choristes
            // visibles. On ne remplace PAS cette logique d'autorisation.
            const { data: membresVisibles, error: rpcErreur } =
                await ctx.supabaseAdmin.rpc("get_trombinoscope", {
                    p_token: token
                });
            if (rpcErreur || !Array.isArray(membresVisibles)) {
                return reponseErreur("Accès refusé", 403);
            }

            // Retrouver la saison de l'utilisateur à partir du même token.
            // Les requêtes admin restent côté serveur, jamais dans React.
            const { data: acces, error: accesErreur } =
                await ctx.supabaseAdmin
                    .from("acces")
                    .select("saison_chanteur_id")
                    .eq("token", token)
                    .eq("actif", true)
                    .is("deleted_at", null)
                    .maybeSingle();
            if (accesErreur || !acces?.saison_chanteur_id) {
                return reponseErreur("Accès refusé", 403);
            }

            const { data: inscription, error: inscriptionErreur } =
                await ctx.supabaseAdmin
                    .from("saison_chanteurs")
                    .select("saison_id")
                    .eq("id", acces.saison_chanteur_id)
                    .is("deleted_at", null)
                    .maybeSingle();
            if (inscriptionErreur || !inscription?.saison_id) {
                return reponseErreur("Saison non accessible", 403);
            }
            const saisonId = inscription.saison_id;

            const [associationsResult, saisonResult] = await Promise.all([
                ctx.supabaseAdmin
                    .from("saison_chanteurs")
                    .select("chanteur_id, groupe_id")
                    .eq("saison_id", saisonId)
                    .is("deleted_at", null),
                ctx.supabaseAdmin
                    .from("saisons")
                    .select("id, nom")
                    .eq("id", saisonId)
                    .maybeSingle()
            ]);
            if (associationsResult.error || saisonResult.error) {
                return reponseErreur("Impossible de charger la saison et les groupes", 500);
            }

            // Attention : seules les identités autorisées par le RPC ci-dessus
            // seront renvoyées, même si la table contient d'autres chanteurs.
            const membresIds = new Set(membresVisibles.map((c) => c.id));
            const associations = (associationsResult.data ?? [])
                .filter((a) => membresIds.has(a.chanteur_id));
            const associationParChanteur = new Map(
                associations.map((a) => [a.chanteur_id, a])
            );

            const groupeIds = [...new Set(
                associations.map((a) => a.groupe_id).filter(Boolean)
            )];
            let groupes: Array<{ id: string; nom: string; description: string | null }> = [];
            if (groupeIds.length) {
                const { data: groupesData, error: groupesErreur } =
                    await ctx.supabaseAdmin
                        .from("groupes")
                        .select("id, nom, description")
                        .in("id", groupeIds);
                if (groupesErreur) {
                    return reponseErreur("Impossible de charger les groupes", 500);
                }
                groupes = groupesData ?? [];
            }
            const groupeParId = new Map(groupes.map((g) => [g.id, g]));

            // Conservation de la sécurité Storage existante : chemins limités
            // à chanteurs/{id}/..., signature serveur et durée de 1 heure.
            const chemins = membresVisibles
                .filter((c) => typeof c.photo === "string" &&
                    c.photo.startsWith(`chanteurs/${c.id}/`))
                .map((c) => c.photo);

            const urlParChemin = new Map<string, string | null>();
            if (chemins.length) {
                const { data: urls, error: urlsErreur } =
                    await ctx.supabaseAdmin.storage
                        .from(BUCKET)
                        .createSignedUrls(chemins, EXPIRATION);
                if (urlsErreur) {
                    return reponseErreur("Erreur de chargement des photos", 500);
                }
                chemins.forEach((chemin, i) => {
                    urlParChemin.set(chemin, urls?.[i]?.signedUrl ?? null);
                });
            }

            const chanteurs = membresVisibles.map((c) => {
                const association = associationParChanteur.get(c.id);
                const groupeId = association?.groupe_id ?? null;
                const groupe = groupeId ? groupeParId.get(groupeId) : null;
                return {
                    id: c.id,
                    nom: c.nom,
                    prenom: c.prenom,
                    photo_url: urlParChemin.get(c.photo) ?? null,
                    groupe_id: groupeId,
                    groupe_nom: groupe?.nom ?? null,
                    groupe_description: groupe?.description ?? null
                };
            });

            return Response.json({
                saison: saisonResult.data
                    ? { id: saisonResult.data.id, nom: saisonResult.data.nom }
                    : null,
                groupes,
                chanteurs
            }, { headers: corsHeaders });
        }
    )
};
