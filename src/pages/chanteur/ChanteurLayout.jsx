import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import ChanteurMenu from "./ChanteurMenu";
import {
    ChanteurProvider,
    useChanteur
} from "./../../components/contexts/ChanteurContext";

import "../../styles/espaceChanteur.css";
import "../../styles/espaceChanteur_popinrepetition.css";
import { chanteurConfig } from "../../config/entities/chanteur.config";
import { repetitionConfig } from "../../config/entities/repetition.config";
import RepetitionParticipation from "../../components/RepetitionParticipation";

function ChanteurLayoutContent() {

    const {
        chanteur,
        setChanteur,
        setLoadingChanteur
    } = useChanteur();

    // --------------------------------------------------
    // POPIN REPETITION
    // --------------------------------------------------

    const [popinOpened, setPopinOpened] = useState(false);
    const [repetitionDuJour, setRepetitionDuJour] = useState(null);

    const [participationRepondue, setParticipationRepondue] =
        useState(false);


    // --------------------------------------------------
    // Vérification répétition du jour
    // --------------------------------------------------

    useEffect(() => {

        console.log("CHANCHEUR :", chanteur);

        if (!chanteur?.id) {
            return;
        }

        const verifierRepetitionDuJour = async () => {

            try {

                const saisonId = chanteur.saison_id;

                const saisonChanteurId =
                    chanteur.saisonChanteur?.id;

                if (!saisonId || !saisonChanteurId) {
                    console.log(
                        "Informations saison/chanteur manquantes"
                    );
                    return;
                }

                console.log(
                    "Vérification répétition :",
                    saisonId,
                    saisonChanteurId
                );

                const { data, error } =
                    await repetitionConfig.service
                        .findDuJourPourChanteur(
                            saisonId,
                            saisonChanteurId
                        );

                console.log(
                    "Répétition du jour :",
                    data,
                    error
                );

                if (error) {

                    console.error(
                        "Erreur vérification répétition du jour",
                        error
                    );

                    return;
                }

                // ------------------------------------------
                // Pas de répétition aujourd'hui
                // ------------------------------------------

                if (!data) {

                    console.log(
                        "Aucune répétition aujourd'hui"
                    );

                    return;
                }

                // ------------------------------------------
                // Participation du chanteur
                // ------------------------------------------

                const participation =
                    data.repetition_chanteurs?.[0]?.participe
                    ?? null;

                console.log(
                    "Participation :",
                    participation
                );

                // ------------------------------------------
                // Réponse déjà donnée pendant cette session
                // ------------------------------------------

                if (participationRepondue) {

                    console.log(
                        "Participation déjà répondue dans la session"
                    );

                    return;
                }

                // ------------------------------------------
                // TRUE ou FALSE
                // → réponse déjà enregistrée
                // ------------------------------------------

                if (participation !== null) {

                    console.log(
                        "Participation déjà enregistrée :",
                        participation
                    );

                    return;
                }

                // ------------------------------------------
                // NULL
                // → pas encore répondu
                // → ouvrir la popin
                // ------------------------------------------

                console.log(
                    "Aucune participation → ouverture de la popin"
                );

                setRepetitionDuJour(data);
                setPopinOpened(true);

            } catch (error) {

                console.error(
                    "Erreur vérification répétition du jour",
                    error
                );

            }

        };

        verifierRepetitionDuJour();

    }, [
        chanteur?.id,
        participationRepondue
    ]);

    const repondreParticipation = async (participe) => {

        try {

            const saisonChanteurId =
                chanteur.saisonChanteur?.id;

            if (!saisonChanteurId) {
                return;
            }

            const { data: repetition } =
                await repetitionConfig.service
                    .findDuJourPourChanteur(
                        chanteur.saison_id,
                        saisonChanteurId
                    );

            if (!repetition) {
                return;
            }

            const { error } =
                await repetitionConfig.service
                    .saveParticipation(
                        saisonChanteurId,
                        repetition.id,
                        participe
                    );

            if (error) {

                console.error(
                    "Erreur enregistrement participation",
                    error
                );

                return;
            }

            // ------------------------------------------
            // Réponse donnée pour cette session
            // ------------------------------------------

            setParticipationRepondue(true);
            setPopinOpened(false);

        } catch (error) {

            console.error(
                "Erreur participation répétition",
                error
            );

        }
    };


    return (

        <div className="chanteur-layout">

            <aside className="chanteur-sidebar">

                <div className="chanteur-sidebar-inner">

                    {/* ... */}

                    <ChanteurMenu
                        chanteur={chanteur}
                    />

                </div>

            </aside>


            <main className="chanteur-content">

                <div className="chanteur-content-inner">

                    <Outlet />

                </div>

            </main>


            {/* --------------------------------------------------
                POPIN
            -------------------------------------------------- */}

            {popinOpened && repetitionDuJour && (

                <RepetitionParticipation

                    repetition={repetitionDuJour}

                    onParticipationChange={(
                        repetitionId,
                        participation
                    ) => {

                        setParticipationRepondue(true);

                    }}

                    onClose={() => {

                        setPopinOpened(false);

                    }}

                />

            )}
        </div>
    );
}


export default function ChanteurLayout() {

    return (

        <ChanteurProvider>

            <ChanteurLayoutContent />

        </ChanteurProvider>

    );
}