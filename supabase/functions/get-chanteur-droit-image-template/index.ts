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
         * 2. Recherche du type de document
         * ----------------------------------------------------
         */

        const {
            data: documentType,
            error: documentTypeError
        } = await supabaseAdmin
            .from("document_types")
            .select("id")
            .eq("code", "droit_image")
            .is("deleted_at", null)
            .maybeSingle();

        if (documentTypeError) {

            return new Response(
                JSON.stringify({
                    error: documentTypeError.message
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

        if (!documentType) {

            return new Response(
                JSON.stringify({
                    error:
                        "Type de document droit_image introuvable"
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
         * 3. Recherche du template
         * ----------------------------------------------------
         */

        const {
            data: template,
            error: templateError
        } = await supabaseAdmin
            .from("referentiel_documents")
            .select("path")
            .eq(
                "document_type_id",
                documentType.id
            )
            .is("deleted_at", null)
            .maybeSingle();

        if (templateError) {

            return new Response(
                JSON.stringify({
                    error: templateError.message
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

        if (!template?.path) {

            return new Response(
                JSON.stringify({
                    error:
                        "Template droit à l'image indisponible"
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
         * 4. URL signée
         * ----------------------------------------------------
         */

        const storageCacheConfig = await readStorageCacheConfig(supabaseAdmin);

        const {
            url,
            error: signedUrlError
        } = await createSignedDownloadUrl(
            supabaseAdmin,
            "referentiel-documents",
            template.path,
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
         * 5. Retour
         * ----------------------------------------------------
         */

        return new Response(
            JSON.stringify({
                path: template.path,
                url: versionStorageUrl(url, storageCacheConfig, "pdf_dai"),
                storage_cache_config: storageCacheConfig
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
            "get-chanteur-droit-image-template",
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