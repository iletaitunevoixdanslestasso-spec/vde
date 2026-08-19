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

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        /*
         * 1. Validation du token chanteur
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
         * 2. Recherche du type de document
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
         * 3. Recherche du template
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
         * 4. Création de l'URL signée
         */
        const {
            data: signedUrl,
            error: signedUrlError
        } = await supabaseAdmin
            .storage
            .from("referentiel-documents")
            .createSignedUrl(
                template.path,
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

        return new Response(
            JSON.stringify({
                path: template.path,
                url: signedUrl.signedUrl
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