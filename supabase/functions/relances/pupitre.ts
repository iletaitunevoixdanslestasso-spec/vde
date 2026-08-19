import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { peutRelancer } from "./relance-utils.ts";

type ChanteurRelance = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  stop_relance_pupitre: boolean;
};

type ResultatRelancePupitre = {
  necessaire: boolean;
  dejaEnvoyee: boolean;
  raison:
    | "STOP"
    | "PUPITRE_PRESENT"
    | "RELANCE_DEJA_ENVOYEE"
    | "RELANCE_NECESSAIRE";
  typeRelanceId: number | null;
  texte: string | null;
};

export async function relancePupitre(
  supabase: SupabaseClient,
  chanteur: ChanteurRelance,
  saisonChanteurId: string,
  saisonId: string
): Promise<ResultatRelancePupitre> {

  console.log(
    `=== VERIFICATION RELANCE PUPITRE : ${chanteur.prenom} ${chanteur.nom} ===`
  );

  // --------------------------------------------------
  // 1. stop_relance_pupitre
  // --------------------------------------------------

  if (chanteur.stop_relance_pupitre === true) {

    console.log(
      `STOP PUPITRE : ${chanteur.prenom} ${chanteur.nom}`
    );

    return {
      necessaire: false,
      dejaEnvoyee: false,
      raison: "STOP",
      typeRelanceId: null,
      texte: null,
    };
  }

  // --------------------------------------------------
  // 2. Type de relance PUPITRE
  // --------------------------------------------------

  const { data: typeRelance, error: typeRelanceError } =
    await supabase
      .from("types_relance")
      .select("id, texte")
      .eq("code", "PUPITRE")
      .eq("actif", true)
      .single();

  if (typeRelanceError) {
    throw typeRelanceError;
  }

  const typeRelanceId = typeRelance.id;
  const texte = typeRelance.texte;

  if (!texte) {
    throw new Error(
      "Le texte de la relance PUPITRE est vide dans types_relance"
    );
  }

  // --------------------------------------------------
  // 3. Vérification du pupitre principal
  // --------------------------------------------------

  const { data: pupitrePrincipal, error: pupitreError } =
    await supabase
      .from("saison_chanteur_pupitres")
      .select("id, pupitre_id")
      .eq("saison_chanteur_id", saisonChanteurId)
      .eq("principal", true)
      .is("deleted_at", null)
      .maybeSingle();

  if (pupitreError) {
    throw pupitreError;
  }

  // --------------------------------------------------
  // 4. Pupitre déjà présent
  // --------------------------------------------------

  if (pupitrePrincipal) {

    console.log(
      `OK PUPITRE : ${chanteur.prenom} ${chanteur.nom}`
    );

    return {
      necessaire: false,
      dejaEnvoyee: false,
      raison: "PUPITRE_PRESENT",
      typeRelanceId,
      texte: null,
    };
  }

  // --------------------------------------------------
  // 5. Vérification dernière relance
  // --------------------------------------------------

  const doitRelancer = await peutRelancer(
    supabase,
    chanteur.id,
    typeRelanceId,
    "saison",
    saisonId
  );

  if (!doitRelancer) {

    console.log(
      `RELANCE PUPITRE DEJA ENVOYEE : ${chanteur.prenom} ${chanteur.nom}`
    );

    return {
      necessaire: false,
      dejaEnvoyee: true,
      raison: "RELANCE_DEJA_ENVOYEE",
      typeRelanceId,
      texte: null,
    };
  }

  // --------------------------------------------------
  // 6. Relance réellement nécessaire
  // --------------------------------------------------

  console.log(
    `RELANCE PUPITRE NECESSAIRE : ${chanteur.prenom} ${chanteur.nom}`
  );

  return {
    necessaire: true,
    dejaEnvoyee: false,
    raison: "RELANCE_NECESSAIRE",
    typeRelanceId,
    texte,
  };
}