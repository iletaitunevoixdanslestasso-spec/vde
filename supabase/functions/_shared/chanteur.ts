import { createClient } from "npm:@supabase/supabase-js@2";

export function createSupabaseAdmin() {
    return createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
}

export async function validateChanteurToken(
    supabaseAdmin,
    token: string
) {

    if (!token) {
        return {
            chanteur: null,
            error: "Token chanteur manquant",
            status: 400
        };
    }

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

        console.error(
            "get_mon_profil error",
            profilError
        );

        return {
            chanteur: null,
            error: profilError.message,
            status: 500
        };
    }

    const chanteur = Array.isArray(profil)
        ? profil[0]
        : profil;

    if (!chanteur?.id) {

        return {
            chanteur: null,
            error: "Token chanteur invalide",
            status: 401
        };
    }

    return {
        chanteur,
        error: null,
        status: 200
    };
}