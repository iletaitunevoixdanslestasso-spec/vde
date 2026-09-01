import {
    createSupabaseAdmin,
    validateChanteurToken
} from "../_shared/chanteur.ts";

import {
    createSignedDownloadUrl
} from "../_shared/storage.ts";

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
        const chansonId = body?.chansonId;

        if (!chansonId) {
            return new Response(
                JSON.stringify({
                    error: "Identifiant de chanson manquant"
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
         * 2. Vérifier que la chanson existe
         * ----------------------------------------------------
         */

        const {
            data: chanson,
            error: chansonError
        } = await supabaseAdmin
            .from("chansons")
            .select(`
                id,
                titre,
                paroles,
                referentiel_documents!chansons_paroles_fkey (
                    id,
                    titre,
                    path,
                    document_type_id,
                    document_types!inner (
                        id,
                        code,
                        libelle
                    )
                )
            `)
            .eq("id", chansonId)
            .is("deleted_at", null)
            .maybeSingle();

        if (chansonError) {

            console.error(
                "get chanson paroles error",
                chansonError
            );

            return new Response(
                JSON.stringify({
                    error: chansonError.message
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

        if (!chanson) {

            return new Response(
                JSON.stringify({
                    error: "Chanson introuvable"
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
         * 3. Vérifier les paroles
         * ----------------------------------------------------
         */

        const document =
            chanson.referentiel_documents;

        if (
            !document ||
            document.document_types?.code !== "paroles" ||
            !document.path
        ) {

            return new Response(
                JSON.stringify({
                    success: true,
                    data: null
                }),
                {
                    status: 200,
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
                success: true,
                data: {
                    id: document.id,
                    titre: document.titre,
                    path: document.path,
                    url
                }
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
            "get-chanteur-chanson-paroles",
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