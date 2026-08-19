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
         * Client Supabase avec clé service
         * utilisée uniquement côté Edge Function.
         */
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        /*
         * ----------------------------------------------------
         * 1. Validation du token chanteur
         * ----------------------------------------------------
         */
        const {
            data: profil,
            error: profilError
        } = await supabaseAdmin.rpc(
            "get_mon_profil",
            {
                p_token: token,
            }
        );

        if (profilError) {
            return new Response(
                JSON.stringify({
                    error: profilError.message
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
         * ----------------------------------------------------
         * 2. Recherche du DAI personnel du chanteur
         * ----------------------------------------------------
         *
         * Le path est déjà stocké dans :
         *
         * chanteurs.droit_image
         *
         */
        const path = chanteur.droit_image;

        if (!path) {
            return new Response(
                JSON.stringify({
                    error:
                        "Le chanteur n'a pas encore envoyé son droit à l'image"
                }),
                {
                    status: 404,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        /*
         * ----------------------------------------------------
         * 3. Création de l'URL signée
         * ----------------------------------------------------
         */
        const {
            data: signedUrl,
            error: signedUrlError
        } = await supabaseAdmin
            .storage
            .from("chanteur-documents")
            .createSignedUrl(
                path,
                3600,
                {
                    download: true
                }
            );

        if (signedUrlError) {
            return new Response(
                JSON.stringify({
                    error: signedUrlError.message
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

        /*
         * ----------------------------------------------------
         * 4. Retour
         * ----------------------------------------------------
         */
        return new Response(
            JSON.stringify({
                path,
                url: signedUrl.signedUrl,
                workflow:
                    chanteur.droit_image_workflow
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
            "get-chanteur-droit-image",
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