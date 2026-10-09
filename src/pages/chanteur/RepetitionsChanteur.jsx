import { useEffect, useState } from "react";

import "../../styles/espaceChanteur_repetition.css";
import "../../styles/espaceChanteur_chansons.css";
import "../../components/repetition_participation/RepetitionParticipationBoutons.css";

import { repetitionConfig }
    from "../../config/entities/repetition.config";

import { useChanteur }
    from "../../components/contexts/ChanteurContext";

import { isPast, openGoogleMaps } from "../../helper/helper";
import EspaceChanteurPageHeader from "../../components/EspaceChanteurPageHeader";
import RepetitionParticipationControllerChanteur from "../../components/repetition_participation/RepetitionParticipationControllerChanteur";
import { Check, CircleHelp, X } from "lucide-react";


function ParticipationEtat({ participation }) {

    const label =
        participation === true
            ? "Je participe"
            : participation === false
                ? "Je ne participe pas"
                : "Je ne sais pas";

    return (
        <div className="participation-buttons">
            <button
                type="button"
                className={`participation-button selected ${
                    participation === true
                        ? "participation-button--yes"
                        : participation === false
                            ? "participation-button--no"
                            : "participation-button--maybe"
                }`}
                disabled
                title={label}
                aria-label={label}
            >
                {participation === true ? (
                    <Check size={20} strokeWidth={2.4} aria-hidden="true" />
                ) : participation === false ? (
                    <X size={20} strokeWidth={2.4} aria-hidden="true" />
                ) : (
                    <CircleHelp size={20} strokeWidth={2.2} aria-hidden="true" />
                )}
            </button>
        </div>
    );
}


export default function RepetitionsChanteur() {

    const [repetitions, setRepetitions] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);

    const [showPast, setShowPast] =
        useState(false);

    const [showUpcoming, setShowUpcoming] =
        useState(true);
    const {
        chanteur,
        loadingChanteur
    } = useChanteur();


    const saisonId =
        chanteur?.saison_id;

    const saisonChanteurId =
        chanteur?.saisonChanteur?.id;


    const controller =
        repetitionConfig.controller;


    useEffect(() => {

        if (loadingChanteur) {
            return;
        }

        if (
            !saisonId ||
            !saisonChanteurId
        ) {
            setLoading(false);
            return;
        }


        setLoading(true);
        setError(null);


        controller.getMesRepetitions(

            saisonId,
            saisonChanteurId,

            result => {

                setRepetitions(
                    result || []
                );

                setLoading(false);
            },

            err => {

                console.error(
                    "Erreur chargement répétitions",
                    err
                );

                setError(
                    "Impossible de charger vos répétitions."
                );

                setLoading(false);
            }
        );

    }, [
        saisonId,
        saisonChanteurId,
        loadingChanteur
    ]);


    if (loading) {

        return (
            <main className="chansons-page concerts-page">

                <EspaceChanteurPageHeader
                    title="Mes répétitions"
                    subtitle="Chargement de vos répétitions..."
                    iconClass="icon-repetition"
                    singular="répétition"
                    plural="répétitions"
                />

                <div className="concerts-loading">
                    Chargement des répétitions...
                </div>

            </main>
        );
    }




    const repetitionsPassees =
        repetitions.filter(
            repetition =>
                isPast(repetition.date)
        );


    const repetitionsAVenir =
        repetitions.filter(
            repetition =>
                !isPast(repetition.date)
        );


    const renderRepetition = repetition => {

        const passed =
            isPast(repetition.date);

        const lieu =
            repetition.rendezvous?.lieux;

        const rendezvousType =
            repetition.rendezvous
                ?.rendezvous_type
                ?.code
            || "repet";

        const isRepetitionSpeciale = rendezvousType === "repetition_spe";

        return (

            <article
                key={repetition.id}
                className={`concert-card repetition-card rendezvous-type-${rendezvousType}`}
            >

                <div className="concert-row">

                    <div className="concert-main">

                        <div
                            className={isRepetitionSpeciale
                                ? "concert-icon icon icon-warning"
                                : "concert-icon icon-repetition"
                            }
                            aria-hidden="true"
                        />

                        <div className="concert-title-content">

                            <h2 className="concert-titre">

                                {repetition
                                    .repetitions_type
                                    ?.libelle
                                    || "Répétition"}

                            </h2>

                            {repetition.accompagne && (

                                <small>
                                    🎹 Répétition accompagnée
                                </small>

                            )}

                        </div>

                    </div>


                    <div className="concert-informations">

                        <div className="concert-information">

                            <span className="concert-information-icon">
                                📅
                            </span>

                            <div className="concert-information-content">

                                <strong>

                                    {new Date(
                                        repetition.date
                                    ).toLocaleDateString(
                                        "fr-FR",
                                        {
                                            weekday: "long",
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric"
                                        }
                                    )}

                                </strong>

                                {passed && (

                                    <small>
                                        Répétition passée
                                    </small>

                                )}

                            </div>

                        </div>


                        {lieu && (

                            <div
                                className={`concert-information concert-information-map${isRepetitionSpeciale ? " rendezvous-lieu-special" : ""}`}
                                role="button"
                                tabIndex={0}
                                title="Ouvrir dans Google Maps"
                                onClick={() => openGoogleMaps(lieu)}
                                onKeyDown={event => {

                                    if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                    ) {
                                        event.preventDefault();
                                        openGoogleMaps(lieu);
                                    }
                                }}
                            >

                                <span className="concert-information-icon">
                                    📍
                                </span>

                                <div className="concert-information-content">

                                    {isRepetitionSpeciale && (
                                        <small className="rendezvous-lieu-special-label">
                                            Lieu de la répétition spéciale
                                        </small>
                                    )}

                                    <strong>
                                        {lieu.nom}
                                    </strong>

                                    <small>

                                        {[
                                            lieu.rue,
                                            lieu.code_postale,
                                            lieu.ville
                                        ]
                                            .filter(Boolean)
                                            .join(", ")}

                                    </small>

                                </div>

                            </div>

                        )}

                    </div>


                    {passed ? (
                        <ParticipationEtat participation={repetition.participation} />
                    ) : (
                        <RepetitionParticipationControllerChanteur
                            repetition={repetition}
                            inline
                            onParticipationChange={(repetitionId, participation) => {
                                setRepetitions(current =>
                                    current.map(item =>
                                        item.id === repetitionId
                                            ? { ...item, participation }
                                            : item
                                    )
                                );
                            }}
                        />
                    )}

                </div>

            </article>

        );
    };

    return (

        <main className="chansons-page concerts-page">

            <EspaceChanteurPageHeader
                title="Mes répétitions"
                subtitle="Retrouvez les répétitions de la saison et consultez votre participation."
                count={repetitions.length > 0 ? repetitions.length : null}
                iconClass="icon-repetition"
                singular="répétition"
                plural="répétitions"
            />


            {error && (
                <div className="concerts-error">
                    ⚠️ {error}
                </div>
            )}


            {!repetitions.length ? (

                <div className="concerts-empty">
                    Aucune répétition pour cette saison.
                </div>

            ) : (

                <div className="liste_rendezvous_groups">


                    {/* ============================= */}
                    {/* RÉPÉTITIONS PASSÉES           */}
                    {/* ============================= */}

                    <div className="liste_rendezvous_group">

                        <button
                            type="button"
                            className="liste_rendezvous_group_toggle"
                            onClick={() =>
                                setShowPast(current => !current)
                            }
                            aria-expanded={showPast}
                        >

                            <span className="liste_rendezvous_group_toggle_title">

                                <span>
                                    Passées
                                </span>

                                <span className="liste_rendezvous_group_count">
                                    {repetitionsPassees.length}
                                </span>

                            </span>


                            <span className="liste_rendezvous_group_chevron">

                                {showPast ? "▲" : "▼"}

                            </span>

                        </button>


                        {showPast && (

                            <section className="liste_rendezvous_group_list">

                                {repetitionsPassees.length > 0 ? (

                                    repetitionsPassees.map(
                                        renderRepetition
                                    )

                                ) : (

                                    <div className="liste_rendezvous_group_empty">
                                        Aucune répétition passée.
                                    </div>

                                )}

                            </section>

                        )}

                    </div>



                    {/* ============================= */}
                    {/* RÉPÉTITIONS À VENIR           */}
                    {/* ============================= */}

                    <div className="liste_rendezvous_group">

                        <button
                            type="button"
                            className="liste_rendezvous_group_toggle"
                            onClick={() =>
                                setShowUpcoming(current => !current)
                            }
                            aria-expanded={showUpcoming}
                        >

                            <span className="liste_rendezvous_group_toggle_title">

                                <span>
                                    À venir
                                </span>

                                <span className="liste_rendezvous_group_count">
                                    {repetitionsAVenir.length}
                                </span>

                            </span>


                            <span className="liste_rendezvous_group_chevron">

                                {showUpcoming ? "▲" : "▼"}

                            </span>

                        </button>


                        {showUpcoming && (

                            <section className="liste_rendezvous_group_list">

                                {repetitionsAVenir.length > 0 ? (

                                    repetitionsAVenir.map(
                                        renderRepetition
                                    )

                                ) : (

                                    <div className="liste_rendezvous_group_empty">
                                        Aucune répétition à venir.
                                    </div>

                                )}

                            </section>

                        )}

                    </div>


                </div>

            )}

        </main>
    );
}