import { useEffect, useState } from "react";

import "../../styles/espaceChanteur_concerts.css";

import { repetitionConfig }
    from "../../config/entities/repetition.config";

import { useChanteur }
    from "../../components/contexts/ChanteurContext";

import RepetitionParticipationControllerChanteur
    from "../../components/repetition_participation/RepetitionParticipationControllerChanteur";


function isPast(date) {

    if (!date) {
        return false;
    }

    const repetitionDate = new Date(date);
    const today = new Date();

    repetitionDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return repetitionDate < today;
}


export default function RepetitionsChanteur() {

    const [repetitions, setRepetitions] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);


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
            <main className="concerts-page">
                Chargement des répétitions...
            </main>
        );
    }


    return (

        <main className="concerts-page">

            <header className="concerts-page-header">

                <div className="concerts-page-header-icon">
                    🎤
                </div>

                <div className="concerts-page-header-content">

                    <div className="concerts-page-eyebrow">
                        Mon espace
                    </div>

                    <h1 className="concerts-page-title">
                        Mes répétitions
                    </h1>

                    <p className="concerts-page-subtitle">
                        Retrouvez les répétitions de la saison
                        et indiquez votre participation.
                    </p>

                </div>

                <div className="concerts-page-count">

                    <strong>
                        {repetitions.length}
                    </strong>

                    <span>
                        {repetitions.length > 1
                            ? "répétitions"
                            : "répétition"}
                    </span>

                </div>

            </header>


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

                <section className="concerts-list">

                    {repetitions.map(repetition => {

                        const passed =
                            isPast(repetition.date);

                        const lieu = repetition.rendezvous?.lieux;
                        const rendezvousType = repetition.rendezvous?.rendezvous_type?.code || "repet";

                        return (

                            <article
                                key={repetition.id}
                                className={`concert-card repetition-card rendezvous-type-${rendezvousType}`}
                            >

                                <div className="concert-row">

                                    <div className="concert-main">

                                        <div className="concert-icon">
                                            🎤
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

                                            <div className="concert-information">

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

                    })}

                </section>

            )}

        </main>
    );
}