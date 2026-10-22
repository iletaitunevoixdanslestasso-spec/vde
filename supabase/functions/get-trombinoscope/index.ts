import { withSupabase } from "npm:@supabase/server@1";

const BUCKET = "photos-chanteurs";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store"
};

export default {
    fetch: withSupabase(
        { auth: "none" },
        async (req, ctx) => {

            if (req.method === "OPTIONS") {
                return new Response(null, {
                    headers: corsHeaders
                });
            }

            if (req.method !== "POST") {
                return Response.json(
                    { error: "Méthode non autorisée" },
                    {
                        status: 405,
                        headers: corsHeaders
                    }
                );
            }

            const { token } = await req.json();

            if (
                typeof token !== "string" ||
                !token.trim()
            ) {
                return Response.json(
                    { error: "Token manquant" },
                    {
                        status: 401,
                        headers: corsHeaders
                    }
                );
            }

            const { data: chanteurs, error } =
                await ctx.supabaseAdmin.rpc(
                    "get_trombinoscope",
                    { p_token: token }
                );

            if (error) {
                return Response.json(
                    { error: "Accès refusé" },
                    {
                        status: 403,
                        headers: corsHeaders
                    }
                );
            }

            const paths = chanteurs
                .filter(c =>
                    c.photo?.startsWith(
                        `chanteurs/${c.id}/`
                    )
                )
                .map(c => c.photo);

            let signedUrls = [];

            if (paths.length) {
                const result = await ctx.supabaseAdmin
                    .storage
                    .from(BUCKET)
                    .createSignedUrls(paths, 3600);

                if (result.error) {
                    return Response.json(
                        { error: "Erreur de chargement des photos" },
                        {
                            status: 500,
                            headers: corsHeaders
                        }
                    );
                }

                signedUrls = result.data;
            }

            const urlByPath = new Map(
                paths.map((path, index) => [
                    path,
                    signedUrls[index]?.signedUrl ?? null
                ])
            );

            const result = chanteurs.map(c => ({
                id: c.id,
                nom: c.nom,
                prenom: c.prenom,
                photo_url: urlByPath.get(c.photo) ?? null
            }));

            return Response.json(
                { chanteurs: result },
                { headers: corsHeaders }
            );
        }
    )
};