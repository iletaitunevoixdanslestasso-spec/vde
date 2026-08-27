import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { peutRelancer } from "./relance-utils.ts";

type ChanteurRelance = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  droit_image_workflow: number;
  stop_relance_dai: boolean;
};

type ResultatRelanceDai = {
  necessaire: boolean;
  dejaEnvoyee: boolean;
  raison:
    | "STOP"
    | "DAI_ACCEPTE"
    | "RELANCE_DEJA_ENVOYEE"
    | "RELANCE_NECESSAIRE";
  typeRelanceId: number | null;
  texte: string | null;
};

export async function relanceDai(
  supabase: SupabaseClient,
  chanteur: ChanteurRelance,
  saisonId: string  
): Promise<ResultatRelanceDai> {

  console.log(
    `=== VERIFICATION RELANCE DAI : ${chanteur.prenom} ${chanteur.nom} ===`
  );

  // --------------------------------------------------
  // 1. stop_relance_dai
  // --------------------------------------------------

  if (chanteur.stop_relance_dai === true) {

    console.log(
      `STOP DAI : ${chanteur.prenom} ${chanteur.nom}`
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
  // 2. Type de relance DAI
  // --------------------------------------------------

  const { data: typeRelance, error: typeRelanceError } =
    await supabase
      .from("types_relance")
      .select("id, texte")
      .eq("code", "DAI")
      .eq("actif", true)
      .single();

  if (typeRelanceError) {
    throw typeRelanceError;
  }

  const typeRelanceId = typeRelance.id;
  const texte = typeRelance.texte;

  if (!texte) {
    throw new Error(
      "Le texte de la relance DAI est vide dans types_relance"
    );
  }

  // --------------------------------------------------
  // 3. DAI déjà accepté
  // --------------------------------------------------

  if (chanteur.droit_image_workflow === 2 || chanteur.droit_image_workflow === 1) {

    console.log(
      `OK DAI : ${chanteur.prenom} ${chanteur.nom}`
    );

    return {
      necessaire: false,
      dejaEnvoyee: false,
      raison: "DAI_ACCEPTE",
      typeRelanceId,
      texte: null,
    };
  }

  // --------------------------------------------------
  // 4. Vérification dernière relance
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
      `RELANCE DAI DEJA ENVOYEE : ${chanteur.prenom} ${chanteur.nom}`
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
  // 5. Relance réellement nécessaire
  // --------------------------------------------------

  console.log(
    `RELANCE DAI NECESSAIRE : ${chanteur.prenom} ${chanteur.nom}`
  );

  return {
    necessaire: true,
    dejaEnvoyee: false,
    raison: "RELANCE_NECESSAIRE",
    typeRelanceId,
    texte,
  };
}