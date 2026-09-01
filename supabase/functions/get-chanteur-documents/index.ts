import { createSupabaseAdmin, validateChanteurToken } from "../_shared/chanteur.ts";
import { createSignedDownloadUrl } from "../_shared/storage.ts";

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
         * 2. Recherche des documents chanteur
         * ----------------------------------------------------
         */

        const {
            data: documents,
            error: documentsError
        } = await supabaseAdmin
            .from("referentiel_documents")
            .select(`
                id,
                titre,
                path,
                document_type_id,
                document_types!inner (
                    id,
                    code,
                    libelle
                )
            `)
            .in(
                "document_types.code",
                [
                    "choriste",
                    "adherent"
                ]
            )
            .is("deleted_at", null)
            .order("titre", {
                ascending: true
            });

        if (documentsError) {

            console.error(
                "findDocumentsChanteur error",
                documentsError
            );

            return new Response(
                JSON.stringify({
                    error: documentsError.message
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
         * 3. URLs signées
         * ----------------------------------------------------
         */

        const documentsAvecUrl =
            await Promise.all(
                (documents || []).map(
                    async document => {

                        if (!document?.path) {

                            return {
                                ...document,
                                downloadUrl: null
                            };
                        }

                        const {
                            url,
                            error: signedUrlError
                        } = await createSignedDownloadUrl(
                            supabaseAdmin,
                            "referentiel-documents",
                            document.path,
                            3600,
                            false
                        );

                        if (signedUrlError) {

                            return {
                                ...document,
                                downloadUrl: null
                            };
                        }

                        return {
                            ...document,
                            downloadUrl: url
                        };
                    }
                )
            );

        /*
         * ----------------------------------------------------
         * 4. Retour
         * ----------------------------------------------------
         */

        return new Response(
            JSON.stringify({
                success: true,
                data: documentsAvecUrl
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
            "get-chanteur-documents",
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