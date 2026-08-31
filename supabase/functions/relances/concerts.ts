import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { peutRelancer } from "./relance-utils.ts";

type ChanteurRelance = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  stop_relance_concert: boolean;
};

type RelanceConcert = {
  saisonRendezvousId: string;
  concertId: string;
  titre: string;
  date: string;
  texte: string;
};

type ResultatRelanceConcert = {
  necessaire: boolean;
  dejaEnvoyee: boolean;
  raison:
    | "STOP"
    | "AUCUN_CONCERT_A_VENIR"
    | "PARTICIPATION_RENSEIGNEE"
    | "RELANCE_DEJA_ENVOYEE"
    | "RELANCE_NECESSAIRE";
  typeRelanceId: number | null;
  relances: RelanceConcert[];
};

export async function relanceConcert(
  supabase: SupabaseClient,
  chanteur: ChanteurRelance,
  saisonChanteurId: string,
  saisonId: string
): Promise<ResultatRelanceConcert> {

  console.log(
    `=== VERIFICATION RELANCE CONCERT : ${chanteur.prenom} ${chanteur.nom} ===`
  );

  // --------------------------------------------------
  // 1. STOP
  // --------------------------------------------------

  if (chanteur.stop_relance_concert === true) {

    console.log(
      `STOP CONCERT : ${chanteur.prenom} ${chanteur.nom}`
    );

    return {
      necessaire: false,
      dejaEnvoyee: false,
      raison: "STOP",
      typeRelanceId: null,
      relances: [],
    };
  }

  // --------------------------------------------------
  // 2. Type de relance
  // --------------------------------------------------

  const { data: typeRelance, error: typeRelanceError } =
    await supabase
      .from("types_relance")
      .select("id, texte")
      .eq("code", "CONCERT")
      .eq("actif", true)
      .single();

  if (typeRelanceError) {
    throw typeRelanceError;
  }

  const typeRelanceId = typeRelance.id;
  const texteBase = typeRelance.texte;

  if (!texteBase) {
    throw new Error(
      "Le texte de la relance CONCERT est vide dans types_relance"
    );
  }

  // --------------------------------------------------
  // 3. Date limite : aujourd'hui + 5 semaines
  // --------------------------------------------------

  const maintenant = new Date();

  const dateLimite = new Date(maintenant);
  dateLimite.setDate(dateLimite.getDate() + 35);

  // --------------------------------------------------
  // 4. Concerts à venir
  // --------------------------------------------------

  const { data: concerts, error: concertsError } =
    await supabase
      .from("saison_rendezvous")
      .select(`
        id,
        rendezvous!inner (
          id,
          titre,
          date,
          deleted_at,
          rendezvous_type!inner (
            code
          )
        )
      `)
      .eq("saison_id", saisonId)
      .is("deleted_at", null)
      .eq("rendezvous.rendezvous_type.code", "concert")
      .is("rendezvous.deleted_at", null)
      .gte("rendezvous.date", maintenant.toISOString())
      .lte("rendezvous.date", dateLimite.toISOString());

  if (concertsError) {
    throw concertsError;
  }

  if (!concerts || concerts.length === 0) {

    console.log(
      `AUCUN CONCERT A VENIR : ${chanteur.prenom} ${chanteur.nom}`
    );

    return {
      necessaire: false,
      dejaEnvoyee: false,
      raison: "AUCUN_CONCERT_A_VENIR",
      typeRelanceId,
      relances: [],
    };
  }

  // --------------------------------------------------
  // 5. Vérification de chaque concert
  // --------------------------------------------------

  const relances: RelanceConcert[] = [];

  for (const saisonRendezvous of concerts) {

    const rendezvous = saisonRendezvous.rendezvous;

    // ------------------------------------------------
    // Participation du chanteur
    // ------------------------------------------------

    const { data: participation, error: participationError } =
      await supabase
        .from("saison_concert_chanteurs")
        .select("id, participe")
        .eq(
          "saison_rendezvous_id",
          saisonRendezvous.id
        )
        .eq(
          "saison_chanteur_id",
          saisonChanteurId
        )
        .is("deleted_at", null)
        .maybeSingle();

    if (participationError) {
      throw participationError;
    }

    // Participation déjà renseignée
    if (
      participation &&
      participation.participe !== null
    ) {
      console.log(
        `PARTICIPATION DEJA RENSEIGNEE : ` +
        `${chanteur.prenom} ${chanteur.nom} ` +
        `=> ${rendezvous.titre}`
      );

      continue;
    }

    // ------------------------------------------------
    // Relance nécessaire pour CE concert
    // ------------------------------------------------

    const doitRelancer = await peutRelancer(
      supabase,
      chanteur.id,
      typeRelanceId,
      "saison_rendezvous",
      saisonRendezvous.id
    );

    if (!doitRelancer) {

      console.log(
        `RELANCE DEJA ENVOYEE : ` +
        `${chanteur.prenom} ${chanteur.nom} ` +
        `=> ${rendezvous.titre}`
      );

      continue;
    }

    // ------------------------------------------------
    // Personnalisation
    // ------------------------------------------------

    const dateConcert = new Date(rendezvous.date);

    const dateFormatee = dateConcert.toLocaleDateString(
      "fr-FR",
      {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );

    const texte = [
      texteBase,
      "",
      `${rendezvous.titre} — ${dateFormatee}`,
    ].join("\n");

    relances.push({
      saisonRendezvousId: saisonRendezvous.id,
      concertId: rendezvous.id,
      titre: rendezvous.titre,
      date: rendezvous.date,
      texte,
    });

    console.log(
      `RELANCE CONCERT NECESSAIRE : ` +
      `${chanteur.prenom} ${chanteur.nom} ` +
      `=> ${rendezvous.titre}`
    );
  }

  // --------------------------------------------------
  // 6. Résultat
  // --------------------------------------------------

  if (relances.length === 0) {

    return {
      necessaire: false,
      dejaEnvoyee: false,
      raison: "PARTICIPATION_RENSEIGNEE",
      typeRelanceId,
      relances: [],
    };
  }

  return {
    necessaire: true,
    dejaEnvoyee: false,
    raison: "RELANCE_NECESSAIRE",
    typeRelanceId,
    relances,
  };
}