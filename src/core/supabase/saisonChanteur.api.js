import { supabase } from "./client";


export async function updateEtatSaisonChanteur(id, etat) {

    const { data, error } = await supabase
        .from("saison_chanteurs")
        .update({
            etat: etat
        })
        .eq("id", id)
        .select()
        .single();


    if (error) {
        console.error(error);
        return null;
    }

    return data;
}