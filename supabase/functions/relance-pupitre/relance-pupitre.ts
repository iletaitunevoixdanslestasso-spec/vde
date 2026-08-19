import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function relancePupitre(
  supabase: SupabaseClient
) {

  console.log("=== RELANCE PUPITRE ===");

  // --------------------------------------------------
  // 1. Saison active
  // --------------------------------------------------

  const { data: saison, error: saisonError } =
    await supabase
      .from("saisons")
      .select("id, nom")
      .eq("active", true)
      .is("deleted_at", null)
      .maybeSingle();

  if (saisonError) {
    throw saisonError;
  }

  if (!saison) {
    return {
      type: "PUPITRE",
      nombre: 0,
      relances: [],
      message: "Aucune saison active",
    };
  }

  // --------------------------------------------------
  // 2. Chanteurs de la saison
  // --------------------------------------------------

  const { data: saisonChanteurs, error: scError } =
    await supabase
      .from("saison_chanteurs")
      .select(`
        id,
        chanteur_id,
        chanteurs (
          id,
          prenom,
          nom,
          email,
          stop_relance_pupitre
        )
      `)
      .eq("saison_id", saison.id)
      .is("deleted_at", null);

  if (scError) {
    throw scError;
  }

  const relances = [];

  // --------------------------------------------------
  // 3. Vérification du pupitre
  // --------------------------------------------------

  for (const saisonChanteur of saisonChanteurs ?? []) {

    const chanteur = saisonChanteur.chanteurs;

    if (!chanteur) {
      continue;
    }

    // ----------------------------------------------
    // stop_relance_pupitre
    // ----------------------------------------------

    if (chanteur.stop_relance_pupitre === true) {

      console.log(
        `STOP PUPITRE : ${chanteur.prenom} ${chanteur.nom}`
      );

      continue;
    }

    // ----------------------------------------------
    // Pupitre principal
    // ----------------------------------------------

    const { data: pupitrePrincipal, error: pupitreError } =
      await supabase
        .from("saison_chanteur_pupitres")
        .select("id, pupitre_id")
        .eq("saison_chanteur_id", saisonChanteur.id)
        .eq("principal", true)
        .is("deleted_at", null)
        .maybeSingle();

    if (pupitreError) {
      throw pupitreError;
    }

    // ----------------------------------------------
    // Pupitre trouvé
    // ----------------------------------------------

    if (pupitrePrincipal) {

      console.log(
        `OK PUPITRE : ${chanteur.prenom} ${chanteur.nom}`
      );

      continue;
    }

    // ----------------------------------------------
    // Relance nécessaire
    // ----------------------------------------------

    console.log(
      `RELANCE PUPITRE : ${chanteur.prenom} ${chanteur.nom}`
    );

    relances.push({
      chanteur_id: chanteur.id,
      prenom: chanteur.prenom,
      nom: chanteur.nom,
      email: chanteur.email,
      saison_id: saison.id,
      saison: saison.nom,
      type: "PUPITRE",
    });
  }

  return {
    type: "PUPITRE",
    saison: {
      id: saison.id,
      nom: saison.nom,
    },
    nombre: relances.length,
    relances,
  };
}