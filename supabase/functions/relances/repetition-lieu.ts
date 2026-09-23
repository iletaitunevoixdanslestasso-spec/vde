import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { peutRelancer } from "./relance-utils.ts";


type ChanteurRelance = {
    id: string;
    prenom: string;
    nom: string;
    email: string;
};


type ResultatRelanceRepetitionLieu = {
    necessaire: boolean;
    dejaEnvoyee: boolean;

    raison:
        | "AUCUNE_REPETITION_A_VENIR"
        | "LIEU_PAR_DEFAUT"
        | "LIEU_NON_RENSEIGNE"
        | "NE_PARTICIPE_PAS"
        | "RELANCE_DEJA_ENVOYEE"
        | "RELANCE_NECESSAIRE";

    typeRelanceId: number | null;

    repetitionId: string | null;
    rendezvousId: string | null;

    texte: string | null;
};


export async function relanceRepetitionLieu(
    supabase: SupabaseClient,
    chanteur: ChanteurRelance,
    saisonChanteurId: string,
    saisonId: string,
    lieuParDefautId: string
): Promise<ResultatRelanceRepetitionLieu> {

    console.log(
        `=== VERIFICATION LIEU PROCHAINE REPETITION : ` +
        `${chanteur.prenom} ${chanteur.nom} ===`
    );


    // ==================================================
    // 1. Type de relance
    // ==================================================

    const {
        data: typeRelance,
        error: typeRelanceError
    } = await supabase
        .from("types_relance")
        .select("id, texte")
        .eq("code", "REPETITION_LIEU")
        .eq("actif", true)
        .single();


    if (typeRelanceError) {
        throw typeRelanceError;
    }


    const typeRelanceId = typeRelance.id;
    const texteBase = typeRelance.texte;


    if (!texteBase) {
        throw new Error(
            "Le texte de la relance REPETITION_LIEU est vide dans types_relance"
        );
    }


    // ==================================================
    // 2. Recherche des répétitions à venir
    //
    // La date est portée par REPETITIONS.
    // Le rendezvous porte le lieu.
    // ==================================================

    const maintenant = new Date();


    const {
        data: repetitions,
        error: repetitionsError
    } = await supabase
        .from("repetitions")
        .select(`
            id,
            date,
            description,
            rendezvous_id,
            repetitions_type_id,

            rendezvous!inner (
                id,
                titre,
                lieu_id,
                deleted_at,

                lieu:lieux (
                    id,
                    nom,
                    rue,
                    ville,
                    code_postale
                ),

                rendezvous_type!inner (
                    code
                )
            )
        `)
        .eq(
            "saison_id",
            saisonId
        )
        .is(
            "deleted_at",
            null
        )
        .in(
            "rendezvous.rendezvous_type.code",
            [
                "repet",
                "repetition_spe"
            ]
        )
        .is(
            "rendezvous.deleted_at",
            null
        )
        .gte(
            "date",
            maintenant.toISOString()
        )
        .order(
            "date",
            {
                ascending: true
            }
        );


    if (repetitionsError) {
        throw repetitionsError;
    }


    // ==================================================
    // 3. Aucune répétition à venir
    // ==================================================

    if (
        !repetitions ||
        repetitions.length === 0
    ) {

        console.log(
            `AUCUNE REPETITION A VENIR : ` +
            `${chanteur.prenom} ${chanteur.nom}`
        );


        return {
            necessaire: false,
            dejaEnvoyee: false,
            raison: "AUCUNE_REPETITION_A_VENIR",
            typeRelanceId,
            repetitionId: null,
            rendezvousId: null,
            texte: null,
        };
    }


    // ==================================================
    // 4. Prochaine répétition
    //
    // La requête est déjà triée par repetitions.date.
    // ==================================================

    const prochaineRepetition =
        repetitions[0];


    const rendezvous =
        prochaineRepetition.rendezvous;


    console.log(
        `PROCHAINE REPETITION : ` +
        `${rendezvous.titre} ` +
        `${prochaineRepetition.date} ` +
        `(repetition ${prochaineRepetition.id})`
    );


    // ==================================================
    // 5. Pas de lieu renseigné
    // ==================================================

    if (!rendezvous.lieu_id) {

        console.log(
            `LIEU NON RENSEIGNE : ` +
            `${rendezvous.titre}`
        );


        return {
            necessaire: false,
            dejaEnvoyee: false,
            raison: "LIEU_NON_RENSEIGNE",
            typeRelanceId,
            repetitionId:
                prochaineRepetition.id,
            rendezvousId:
                rendezvous.id,
            texte: null,
        };
    }


    // ==================================================
    // 6. La répétition est dans le lieu habituel
    // ==================================================

    if (
        rendezvous.lieu_id === lieuParDefautId
    ) {

        console.log(
            `LIEU PAR DEFAUT : ` +
            `${rendezvous.titre}`
        );


        return {
            necessaire: false,
            dejaEnvoyee: false,
            raison: "LIEU_PAR_DEFAUT",
            typeRelanceId,
            repetitionId:
                prochaineRepetition.id,
            rendezvousId:
                rendezvous.id,
            texte: null,
        };
    }


    // ==================================================
    // 7. Participation du chanteur
    //
    // repetition_chanteurs.repetition_id
    // correspond directement à repetitions.id.
    // ==================================================

    const {
        data: participation,
        error: participationError
    } = await supabase
        .from("repetition_chanteurs")
        .select(`
            id,
            participe
        `)
        .eq(
            "repetition_id",
            prochaineRepetition.id
        )
        .eq(
            "saison_chanteur_id",
            saisonChanteurId
        )
        .is(
            "deleted_at",
            null
        )
        .maybeSingle();


    if (participationError) {
        throw participationError;
    }


    // ==================================================
    // 8. Le chanteur a explicitement répondu NON
    //
    // false        => pas de relance
    // true         => relance
    // null         => relance
    // aucune ligne => relance
    // ==================================================

    if (
        participation?.participe === false
    ) {

        console.log(
            `NE PARTICIPE PAS : ` +
            `${chanteur.prenom} ${chanteur.nom} ` +
            `=> ${rendezvous.titre}`
        );


        return {
            necessaire: false,
            dejaEnvoyee: false,
            raison: "NE_PARTICIPE_PAS",
            typeRelanceId,
            repetitionId:
                prochaineRepetition.id,
            rendezvousId:
                rendezvous.id,
            texte: null,
        };
    }


    // ==================================================
    // 9. Relance déjà envoyée ?
    //
    // IMPORTANT :
    // la relance est liée directement à la répétition.
    //
    // objet_type = "repetition"
    // objet_id   = repetitions.id
    // ==================================================

    const doitRelancer =
        await peutRelancer(
            supabase,
            chanteur.id,
            typeRelanceId,
            "repetition",
            prochaineRepetition.id
        );


    if (!doitRelancer) {

        console.log(
            `RELANCE LIEU REPETITION DEJA ENVOYEE : ` +
            `${chanteur.prenom} ${chanteur.nom} ` +
            `=> ${rendezvous.titre}`
        );


        return {
            necessaire: false,
            dejaEnvoyee: true,
            raison: "RELANCE_DEJA_ENVOYEE",
            typeRelanceId,
            repetitionId:
                prochaineRepetition.id,
            rendezvousId:
                rendezvous.id,
            texte: null,
        };
    }


    // ==================================================
    // 10. Construction du texte
    // ==================================================

    const dateRepetition =
        new Date(
            prochaineRepetition.date
        );


    const dateFormatee =
        dateRepetition.toLocaleDateString(
            "fr-FR",
            {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }
        );


    const lieu =
        rendezvous.lieu;


    const nomLieu =
        lieu?.nom ??
        "Lieu exceptionnel";


    const adresse = [
        lieu?.rue,
        lieu?.code_postale,
        lieu?.ville
    ]
        .filter(Boolean)
        .join(" ");


    const texte = [
        texteBase,
        "",
        `📅 ${rendezvous.titre} — ${dateFormatee}`,
        `📍 ${nomLieu}`,
        adresse || null
    ]
        .filter(Boolean)
        .join("\n");


    // ==================================================
    // 11. Relance nécessaire
    // ==================================================

    console.log(
        `RELANCE LIEU REPETITION NECESSAIRE : ` +
        `${chanteur.prenom} ${chanteur.nom} ` +
        `=> ${rendezvous.titre} / ${nomLieu}`
    );


    return {
        necessaire: true,
        dejaEnvoyee: false,
        raison: "RELANCE_NECESSAIRE",
        typeRelanceId,
        repetitionId:
            prochaineRepetition.id,
        rendezvousId:
            rendezvous.id,
        texte,
    };
}