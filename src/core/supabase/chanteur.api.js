import { supabase } from "./client";

export async function getChanteurByToken(token) {
  const { data, error } = await supabase
    .from("acces")
    .select(`
        *,
        saison_chanteurs!inner (
            etat (*),
            id,
            saison_id,
            chanteur_id,
            deleted_at,
            chanteurs (*),
            saisons (*)
        )
    `)
    .eq("token", token)
    .eq("actif", true)
    .is("deleted_at", null)
    .is("saison_chanteurs.deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    chanteur: data.saison_chanteurs,
  };
}