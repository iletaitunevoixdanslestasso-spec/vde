import {
    createSupabaseAdmin,
    validateChanteurToken
} from "../_shared/chanteur.ts";

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

        const supabaseAdmin =
            createSupabaseAdmin();

        /*
         * ----------------------------------------------------
         * 1. Validation du token chanteur
         * ----------------------------------------------------
         */

        const {
            chanteur,
            error: validationError,
            status: validationStatus
        } = await validateChanteurToken(
            supabaseAdmin,
            token
        );

        if (validationError) {

            return new Response(
                JSON.stringify({
                    error: validationError
                }),
                {
                    status: validationStatus,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        /*
         * ----------------------------------------------------
         * 2. Nom imposé du fichier
         * ----------------------------------------------------
         */

        const path =
            `${chanteur.id}/droit_image.pdf`;

        /*
         * ----------------------------------------------------
         * 3. URL d'upload signée
         * ----------------------------------------------------
         */

        const {
            data: signedUpload,
            error: signedUploadError,
        } = await supabaseAdmin
            .storage
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

        /*
         * ----------------------------------------------------
         * 4. Retour
         * ----------------------------------------------------
         */

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