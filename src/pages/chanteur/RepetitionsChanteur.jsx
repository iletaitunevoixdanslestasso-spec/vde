import { useEffect, useState } from "react";

import "../../styles/espaceChanteur_repetition.css";
import "../../styles/espaceChanteur_chansons.css";

import { repetitionConfig }
    from "../../config/entities/repetition.config";

import { useChanteur }
    from "../../components/contexts/ChanteurContext";

import RepetitionParticipationControllerChanteur
    from "../../components/repetition_participation/RepetitionParticipationControllerChanteur";
import { isPast, openGoogleMaps } from "../../helper/helper";
import EspaceChanteurPageHeader from "../../components/EspaceChanteurPageHeader";





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


        return (

            <article
                key={repetition.id}
                className={`concert-card repetition-card rendezvous-type-${rendezvousType}`}
            >

                <div className="concert-row">

                    <div className="concert-main">

                        <div className="concert-icon icon-repetition">
                        </div>

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
                                className="concert-information concert-information-map"
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


                    <RepetitionParticipationControllerChanteur
                        repetition={repetition}
                        inline
                        disabled={passed}
                        onParticipationChange={(
                            repetitionId,
                            participation
                        ) => {

                            setRepetitions(
                                current =>
                                    current.map(
                                        item =>
                                            item.id === repetitionId
                                                ? {
                                                    ...item,
                                                    participation
                                                }
                                                : item
                                    )
                            );

                        }}
                    />

                </div>

            </article>

        );
    };

    return (

        <main className="chansons-page concerts-page">

            <EspaceChanteurPageHeader
                title="Mes répétitions"
                subtitle="Retrouvez les répétitions de la saison et indiquez votre participation."
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

                <div className="repetitions-groups">


                    {/* ============================= */}
                    {/* RÉPÉTITIONS PASSÉES           */}
                    {/* ============================= */}

                    <div className="repetitions-group">

                        <button
                            type="button"
                            className="repetitions-group-toggle"
                            onClick={() =>
                                setShowPast(current => !current)
                            }
                            aria-expanded={showPast}
                        >

                            <span className="repetitions-group-toggle-title">

                                <span>
                                    Passées
                                </span>

                                <span className="repetitions-group-count">
                                    {repetitionsPassees.length}
                                </span>

                            </span>


                            <span className="repetitions-group-chevron">

                                {showPast ? "▲" : "▼"}

                            </span>

                        </button>


                        {showPast && (

                            <section className="concerts-list">

                                {repetitionsPassees.length > 0 ? (

                                    repetitionsPassees.map(
                                        renderRepetition
                                    )

                                ) : (

                                    <div className="repetitions-group-empty">
                                        Aucune répétition passée.
                                    </div>

                                )}

                            </section>

                        )}

                    </div>



                    {/* ============================= */}
                    {/* RÉPÉTITIONS À VENIR           */}
                    {/* ============================= */}

                    <div className="repetitions-group">

                        <button
                            type="button"
                            className="repetitions-group-toggle"
                            onClick={() =>
                                setShowUpcoming(current => !current)
                            }
                            aria-expanded={showUpcoming}
                        >

                            <span className="repetitions-group-toggle-title">

                                <span>
                                    À venir
                                </span>

                                <span className="repetitions-group-count">
                                    {repetitionsAVenir.length}
                                </span>

                            </span>


                            <span className="repetitions-group-chevron">

                                {showUpcoming ? "▲" : "▼"}

                            </span>

                        </button>


                        {showUpcoming && (

                            <section className="concerts-list">

                                {repetitionsAVenir.length > 0 ? (

                                    repetitionsAVenir.map(
                                        renderRepetition
                                    )

                                ) : (

                                    <div className="repetitions-group-empty">
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