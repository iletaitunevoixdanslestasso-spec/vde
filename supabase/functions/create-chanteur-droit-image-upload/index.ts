import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":
        "POST, OPTIONS",
};

Deno.serve(async (req) => {

    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders,
        });
    }

    try {

        const body = await req.json();

        const token = body?.token;

        if (!token) {
            return new Response(
                JSON.stringify({
                    error: "Token chanteur manquant"
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        /*
         * Client ADMIN / SERVICE
         *
         * La clé secrète reste uniquement côté serveur.
         */
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        /*
         * Vérification du token métier chanteur
         *
         * On réutilise ta RPC existante.
         */
        const {
            data: profil,
            error: profilError,
        } = await supabaseAdmin.rpc(
            "get_mon_profil",
            {
                p_token: token,
            }
        );

        if (profilError) {
            console.error(
                "get_mon_profil error",
                profilError
            );

            return new Response(
                JSON.stringify({
                    error: "Impossible de vérifier le token"
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        const chanteur = Array.isArray(profil)
            ? profil[0]
            : profil;

        if (!chanteur?.id) {
            return new Response(
                JSON.stringify({
                    error: "Token chanteur invalide"
                }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        /*
         * On impose nous-mêmes le nom du fichier.
         *
         * Le navigateur ne décide donc pas du chemin Storage.
         */
        const path =
            `${chanteur.id}/droit_image.pdf`;

        /*
         * URL d'upload signée
         *
         * La fonction serveur utilise la clé secrète,
         * donc elle peut créer cette autorisation.
         */
        const {
            data: signedUpload,
            error: signedUploadError,
        } = await supabaseAdmin.storage
            .from("chanteur-documents")
            .createSignedUploadUrl(
                path,
                {
                    upsert: true,
                }
            );

        if (signedUploadError) {
            console.error(
                "createSignedUploadUrl error",
                signedUploadError
            );

            return new Response(
                JSON.stringify({
                    error: signedUploadError.message
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        return new Response(
            JSON.stringify({
                path,
                token: signedUpload.token,
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );

    } catch (error) {

        console.error(
            "create-chanteur-droit-image-upload",
            error
        );

        return new Response(
            JSON.stringify({
                error: error.message
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    }
});