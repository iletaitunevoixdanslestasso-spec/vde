import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function relanceDai(
  supabase: SupabaseClient
) {

  console.log("=== RELANCE DAI ===");

  // --------------------------------------------------
  // 1. Récupérer les chanteurs
  // --------------------------------------------------

  const { data: chanteurs, error } =
    await supabase
      .from("chanteurs")
      .select(`
        id,
        prenom,
        nom,
        email,
        droit_image_workflow,
        stop_relance_dai
      `)
      .is("deleted_at", null);

  if (error) {
    throw error;
  }

  const relances = [];

  // --------------------------------------------------
  // 2. Vérification de chaque chanteur
  // --------------------------------------------------

  for (const chanteur of chanteurs ?? []) {

    // ----------------------------------------------
    // stop_relance_dai
    // ----------------------------------------------

    if (chanteur.stop_relance_dai === true) {

      console.log(
        `STOP DAI : ${chanteur.prenom} ${chanteur.nom}`
      );

      continue;
    }

    // ----------------------------------------------
    // DAI accepté = workflow 2
    // ----------------------------------------------

    if (chanteur.droit_image_workflow === 2) {

      console.log(
        `OK DAI : ${chanteur.prenom} ${chanteur.nom}`
      );

      continue;
    }

    // ----------------------------------------------
    // Relance nécessaire
    // ----------------------------------------------

    console.log(
      `RELANCE DAI : ${chanteur.prenom} ${chanteur.nom}`
    );

    relances.push({
      chanteur_id: chanteur.id,
      prenom: chanteur.prenom,
      nom: chanteur.nom,
      email: chanteur.email,
      droit_image_workflow:
        chanteur.droit_image_workflow,
      type: "DAI",
    });
  }

  return {
    type: "DAI",
    nombre: relances.length,
    relances,
  };
}