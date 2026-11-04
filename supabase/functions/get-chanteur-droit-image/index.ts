import { readStorageCacheConfig, versionStorageUrl } from "../_shared/storage-cache.ts";
import { createSupabaseAdmin, validateChanteurToken } from "../_shared/chanteur.ts";
import { createSignedDownloadUrl } from "../_shared/storage.ts";

const corsHeaders = {
    "Cache-Control": "no-store",
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
         * 2. Recherche du DAI personnel
         * ----------------------------------------------------
         */

        const path =
            chanteur.droit_image;

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
         * 3. URL signée
         * ----------------------------------------------------
         */

        const storageCacheConfig = await readStorageCacheConfig(supabaseAdmin);

        const {
            url,
            error: signedUrlError
        } = await createSignedDownloadUrl(
            supabaseAdmin,
            "chanteur-documents",
            path,
            3600,
            true
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
                url: versionStorageUrl(url, storageCacheConfig, "pdf_dai"),
                storage_cache_config: storageCacheConfig,
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