import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { relancePupitre } from "./pupitre.ts";
import { relanceDai } from "./dai.ts";
import { relanceConcert } from "./concerts.ts";

import {
  envoyerMailRelance,
  enregistrerRelance,
} from "./relance-utils.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


Deno.serve(async (req) => {

  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }


  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );


    console.log("=== MOTEUR DE RELANCES ===");


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

      console.log("AUCUNE SAISON ACTIVE");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucune saison active",
          nombreChanteurs: 0,
          nombreMails: 0,
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


    console.log(
      `SAISON ACTIVE : ${saison.nom} (${saison.id})`
    );


    // --------------------------------------------------
    // 2. Chanteurs actifs de la saison active
    // --------------------------------------------------

    const { data: saisonChanteurs, error: saisonChanteursError } =
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
            stop_relance_pupitre,
            stop_relance_dai,
            stop_relance_concert,
            droit_image_workflow
          )
        `)
        .eq("saison_id", saison.id)
        .is("deleted_at", null);

    if (saisonChanteursError) {
      throw saisonChanteursError;
    }


    console.log(
      `NOMBRE DE CHANTEURS : ${saisonChanteurs?.length ?? 0}`
    );


    const resultats = [];

    let nombreMails = 0;


    // ==================================================
    // 3. Traitement chanteur par chanteur
    // ==================================================

    for (const saisonChanteur of saisonChanteurs ?? []) {

      const chanteur = saisonChanteur.chanteurs;

      if (!chanteur) {
        continue;
      }


      console.log(
        `=== ${chanteur.prenom} ${chanteur.nom} ===`
      );


      // ------------------------------------------------
      // 3a. Métier PUPITRE
      // ------------------------------------------------

      const resultatPupitre = await relancePupitre(
        supabase,
        chanteur,
        saisonChanteur.id,
        saison.id
      );


      // ------------------------------------------------
      // 3b. Métier DAI
      // ------------------------------------------------

      const resultatDai = await relanceDai(
        supabase,
        chanteur,
        saison.id
      );


      // ------------------------------------------------
      // 3c. Métier CONCERT
      // ------------------------------------------------

      const resultatConcert = await relanceConcert(
        supabase,
        chanteur,
        saisonChanteur.id,
        saison.id
      );


      // ------------------------------------------------
      // 4. Agrégation des textes métier
      // ------------------------------------------------

      const textesRelance: string[] = [];


      if (resultatPupitre.necessaire && resultatPupitre.texte) {
        textesRelance.push(resultatPupitre.texte);
      }


      if (resultatDai.necessaire && resultatDai.texte) {
        textesRelance.push(resultatDai.texte);
      }


      // ------------------------------------------------
      // Relances CONCERT
      // ------------------------------------------------

      for (const relance of resultatConcert.relances) {
        textesRelance.push(relance.texte);
      }


      // ------------------------------------------------
      // TEST EXISTANT
      // ------------------------------------------------

      textesRelance.push("pour test je force");


      // ------------------------------------------------
      // 5. Aucune relance
      // ------------------------------------------------

      if (textesRelance.length === 0) {

        console.log(
          `AUCUNE RELANCE : ${chanteur.prenom} ${chanteur.nom}`
        );

        resultats.push({
          chanteur_id: chanteur.id,
          prenom: chanteur.prenom,
          nom: chanteur.nom,
          email: chanteur.email,
          mail_envoye: false,
        });

        continue;
      }


      // ------------------------------------------------
      // Token d'accès du chanteur
      // ------------------------------------------------

      const { data: acces, error: accesError } = await supabase
        .from("acces")
        .select("token")
        .eq("saison_chanteur_id", saisonChanteur.id)
        .eq("actif", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (accesError) {
        throw accesError;
      }


      if (!acces?.token) {

        console.log(
          `AUCUN TOKEN D'ACCÈS : ${chanteur.prenom} ${chanteur.nom}`
        );

        // On peut continuer sans lien
      }


      const appUrl = Deno.env.get("APP_URL");

      if (!appUrl) {
        throw new Error(
          "La variable APP_URL n'est pas configurée"
        );
      }


      const lienEspaceChanteur = acces?.token
        ? `${appUrl}/chanteur/${acces.token}`
        : null;


      // ------------------------------------------------
      // 6. Mail commun
      // ------------------------------------------------

      const text = [
        `Hello ${chanteur.prenom}, Voix de l'Est !`,
        "",
        textesRelance.join("\n\n"),
        "",
        lienEspaceChanteur
          ? `👉 Accéder à mon espace chanteur : ${lienEspaceChanteur}`
          : "👉 Ton lien d'accès n'est pas disponible, contacte le CA.",
        "",
        "À très vite !",
      ].join("\n");


      const subject =
        `Informations à compléter - saison ${saison.nom}`;


      // ==================================================
      // 7. ENVOI DU MAIL
      // ==================================================

      let resultatMail: {
        success: boolean;
        messageId: string;
      };


      try {

        console.log(
          `ENVOI MAIL : ${chanteur.prenom} ${chanteur.nom}`
        );


        // const resultatMail = true

        resultatMail = await envoyerMailRelance({
          to: chanteur.email,
          subject,
          text,
        });


        console.log(
          `MAIL ENVOYE : ${chanteur.prenom} ${chanteur.nom} - ${resultatMail.messageId}`
        );


        nombreMails++;


        // ==================================================
        // 8. ENREGISTREMENT DES RELANCES - SUCCES
        // ==================================================

        // ------------------------------------------------
        // PUPITRE
        // ------------------------------------------------

        if (
          resultatPupitre.necessaire &&
          resultatPupitre.typeRelanceId !== null
        ) {

          await enregistrerRelance(
            supabase,
            chanteur.id,
            resultatPupitre.typeRelanceId,
            "saison",
            saison.id,
            "SUCCES",
            resultatMail.messageId,
            null
          );
        }


        // ------------------------------------------------
        // DAI
        // ------------------------------------------------

        if (
          resultatDai.necessaire &&
          resultatDai.typeRelanceId !== null
        ) {

          await enregistrerRelance(
            supabase,
            chanteur.id,
            resultatDai.typeRelanceId,
            "saison",
            saison.id,
            "SUCCES",
            resultatMail.messageId,
            null
          );
        }


        // ------------------------------------------------
        // CONCERT
        // ------------------------------------------------

        for (const relance of resultatConcert.relances) {

          if (resultatConcert.typeRelanceId !== null) {

            await enregistrerRelance(
              supabase,
              chanteur.id,
              resultatConcert.typeRelanceId,
              "saison_rendezvous",
              relance.saisonRendezvousId,
              "SUCCES",
              resultatMail.messageId,
              null
            );
          }
        }


        resultats.push({
          chanteur_id: chanteur.id,
          prenom: chanteur.prenom,
          nom: chanteur.nom,
          email: chanteur.email,
          pupitre: resultatPupitre.necessaire,
          dai: resultatDai.necessaire,
          concert: resultatConcert.relances.length > 0,
          mail_envoye: true,
          mail_contenet: text,
          message_id: resultatMail.messageId,
        });


      } catch (error) {

        // ==================================================
        // 9. ERREUR ENVOI MAIL
        // ==================================================

        const erreur =
          error instanceof Error
            ? error.message
            : String(error);


        console.error(
          `ERREUR ENVOI MAIL : ${chanteur.prenom} ${chanteur.nom}`,
          error
        );


        // ==================================================
        // ENREGISTREMENT DES RELANCES - ERREUR
        // ==================================================

        // ------------------------------------------------
        // PUPITRE
        // ------------------------------------------------

        if (
          resultatPupitre.necessaire &&
          resultatPupitre.typeRelanceId !== null
        ) {

          try {

            await enregistrerRelance(
              supabase,
              chanteur.id,
              resultatPupitre.typeRelanceId,
              "saison",
              saison.id,
              "ERREUR",
              null,
              erreur
            );

          } catch (erreurEnregistrement) {

            console.error(
              "ERREUR ENREGISTREMENT RELANCE PUPITRE :",
              erreurEnregistrement
            );
          }
        }


        // ------------------------------------------------
        // DAI
        // ------------------------------------------------

        if (
          resultatDai.necessaire &&
          resultatDai.typeRelanceId !== null
        ) {

          try {

            await enregistrerRelance(
              supabase,
              chanteur.id,
              resultatDai.typeRelanceId,
              "saison",
              saison.id,
              "ERREUR",
              null,
              erreur
            );

          } catch (erreurEnregistrement) {

            console.error(
              "ERREUR ENREGISTREMENT RELANCE DAI :",
              erreurEnregistrement
            );
          }
        }


        // ------------------------------------------------
        // CONCERT
        // ------------------------------------------------

        for (const relance of resultatConcert.relances) {

          if (resultatConcert.typeRelanceId !== null) {

            try {

              await enregistrerRelance(
                supabase,
                chanteur.id,
                resultatConcert.typeRelanceId,
                "saison_rendezvous",
                relance.saisonRendezvousId,
                "ERREUR",
                null,
                erreur
              );

            } catch (erreurEnregistrement) {

              console.error(
                "ERREUR ENREGISTREMENT RELANCE CONCERT :",
                erreurEnregistrement
              );
            }
          }
        }


        resultats.push({
          chanteur_id: chanteur.id,
          prenom: chanteur.prenom,
          nom: chanteur.nom,
          email: chanteur.email,
          pupitre: resultatPupitre.necessaire,
          dai: resultatDai.necessaire,
          concert: resultatConcert.relances.length > 0,
          mail_envoye: false,
          erreur,
        });
      }
    }


    // --------------------------------------------------
    // 10. Résultat global
    // --------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,

        saison: {
          id: saison.id,
          nom: saison.nom,
        },

        nombreChanteurs:
          saisonChanteurs?.length ?? 0,

        nombreMails,

        resultats,
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
      "RELANCES ERROR :",
      error
    );


    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
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