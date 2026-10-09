import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "../../styles/espaceChanteur_concerts.css";
import "../../styles/espaceChanteur_chansons.css";
import "../../components/repetition_participation/RepetitionParticipationBoutons.css";
import { saisonconcertConfig } from "../../config/entities/saisonconcert.config";
import { useChanteur } from "../../components/contexts/ChanteurContext";
import RepresentationsChoeur from "../../components/RepresentationsChoeur";
import ConcertParticipation from "../../components/ConcertParticipation";
import { isPast } from "../../helper/helper";
import EspaceChanteurPageHeader from "../../components/EspaceChanteurPageHeader";
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


export default function ConcertsChanteur() {

    const [concerts, setConcerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [concertChansons, setConcertChansons] = useState({});
    const [chansonsLoading, setChansonsLoading] = useState(null);
    const [concertChansonsOpen, setConcertChansonsOpen] = useState(null);

    const [error, setError] = useState(null);
    const [showPast, setShowPast] = useState(false);
    const [showUpcoming, setShowUpcoming] = useState(true);
    const {
        token,
        chanteur,
        loadingChanteur,
        setChanteur
    } = useChanteur();


    const saisonId = chanteur?.saison_id;
    const chanteurId = chanteur?.id;
    // const token = localStorage.getItem("token");

    const controller =
        saisonconcertConfig.controller;

    const [
        concertRepartitionOpen,
        setConcertRepartitionOpen
    ] = useState(null);

    const handleShowRepartition = async (concert) => {

        const saisonRendezvousId =
            concert.saison_rendezvous?.[0]?.id;


        if (!saisonRendezvousId) {

            console.error(
                "saison_rendezvous_id absent",
                concert
            );

            return;
        }


        /*
         * Les chansons sont déjà chargées :
         * on ouvre directement.
         */

        if (concertChansons[concert.id]) {

            setConcertRepartitionOpen(
                concert.id
            );

            return;
        }


        setChansonsLoading(
            concert.id
        );


        try {

            const result =
                await controller.getChansonsConcert(
                    token,
                    saisonRendezvousId
                );


            const chansons =
                result?.data || [];


            setConcertChansons(
                current => ({
                    ...current,

                    [concert.id]:
                        chansons
                })
            );


            setConcertRepartitionOpen(
                concert.id
            );

        }
        catch (err) {

            console.error(
                "Erreur chargement chansons",
                err
            );


            setError(
                "Impossible de charger les chansons du concert."
            );

        }
        finally {

            setChansonsLoading(
                null
            );
        }
    };



    const handleShowChansons = async (concert) => {

        const saisonRendezvousId =
            concert.saison_rendezvous?.[0]?.id;

        console.error("concert", concert);

        if (!saisonRendezvousId) {
            console.error(
                "saison_rendezvous_id absent",
                concert
            );
            return;
        }

        // Si déjà chargé, on ouvre simplement la popin
        if (concertChansons[concert.id]) {
            setConcertChansonsOpen(concert.id);
            return;
        }

        setChansonsLoading(concert.id);

        try {

            const result = await controller.getChansonsConcert(
                token,
                saisonRendezvousId
            );

            console.error("chansons concert", result);
            const chansons = result?.data || [];

            setConcertChansons(current => ({
                ...current,
                [concert.id]: chansons
            }));

            setConcertChansonsOpen(concert.id);

        } catch (err) {

            console.error(
                "Erreur chargement chansons",
                err
            );

            setError(
                "Impossible de charger les chansons du concert."
            );

        } finally {

            setChansonsLoading(null);

        }
    };

    const handleCloseChansons = () => {
        setConcertChansonsOpen(null);
    };
    /*
     * =====================================================
     * CHARGEMENT DES CONCERTS
     * =====================================================
     */

    useEffect(() => {

        if (!saisonId || !chanteurId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        controller.getMesConcerts(
            token,
            saisonId,
            chanteurId,

            (result) => {

                setConcerts(result || []);
                setLoading(false);
            },

            (err) => {

                console.error(
                    "Erreur chargement concerts",
                    err
                );

                setError(
                    "Impossible de charger vos concerts."
                );

                setLoading(false);
            }
        );

    }, [saisonId, chanteurId, token]);

    /*
     * =====================================================
     * MODIFICATION DE LA PARTICIPATION
     * =====================================================
     */



    /*
     * =====================================================
     * CHARGEMENT
     * =====================================================
     */

    if (loading) {

        return (
            <main className="chansons-page concerts-page">


                <EspaceChanteurPageHeader
                    title="Mes Concerts"
                    subtitle="Chargement des concerts..."
                    iconClass="icon-concert"
                    singular="concert"
                    plural="concerts"
                />


                <div className="concerts-loading">

                    <span className="concerts-loading-icon">
                        🎵
                    </span>

                    <span>
                        Chargement...
                    </span>

                </div>

            </main>
        );
    }

    /*
     * =====================================================
     * PAS DE SAISON
     * =====================================================
     */

    if (!saisonId) {

        return (
            <main className="chansons-page concerts-page">

                <EspaceChanteurPageHeader
                    title="Mes Concerts"
                    subtitle="GROS problème de conf..."
                    iconClass="icon-concert"
                    singular="concert"
                    plural="concerts"
                />

            </main>
        );
    }

    /*
     * =====================================================
     * AUCUN CONCERT
     * =====================================================
     */

    if (!concerts.length) {

        return (
            <main className="chansons-page concerts-page">

                <EspaceChanteurPageHeader
                    title="Mes Concerts"
                    subtitle="Les concerts programmées pour cette saison apparaîtront ici."
                    iconClass="icon-concert"
                    singular="concert"
                    plural="concerts"
                />

                <div className="concerts-empty">

                    <div className="concerts-empty-icon">
                        🎶
                    </div>

                    <div>

                        <strong>
                            Aucun concert disponible
                        </strong>

                        <p>
                            Aucun concert n'est actuellement
                            disponible pour cette saison.
                        </p>

                    </div>

                </div>

            </main>
        );
    }

    const concertsPasses =
        concerts.filter(
            concert =>
                isPast(concert.date)
        );


    const concertsAVenir =
        concerts.filter(
            concert =>
                !isPast(concert.date)
        );


    const renderConcert = concert => {

        const passed = isPast(concert.date);

        return (
            <article
                key={concert.id}
                className="concert-card rendezvous-type-concert"
            >

                <div className="concert-row">

                    {/* =================================
                        TITRE
                       ================================= */}

                    <div className="concert-main">

                        <div className="concert-icon">
                            <button
                                type="button"
                                className="concert-icon-button"
                                onClick={() => handleShowChansons(concert)}
                                title="Voir les chansons du concert"
                                aria-label={`Voir les chansons de ${concert.titre}`}
                                disabled={chansonsLoading === concert.id}
                            >
                                {chansonsLoading === concert.id ? (
                                    <span className="concert-icon-spinner">
                                        ↻
                                    </span>
                                ) : (
                                    <span className="concert-music-note icon-chanson" aria-hidden="true"></span>
                                )}
                            </button>
                        </div>
                        <div className="concert-icon">
                            <button
                                type="button"
                                className="concert-icon-button"
                                onClick={() =>
                                    handleShowRepartition(concert)
                                }
                                title="Voir la répartition du chœur"
                                aria-label={`Voir la répartition de ${concert.titre}`}
                                disabled={
                                    chansonsLoading === concert.id
                                }
                            >
                                <span
                                    className="chanson-action-icon icon-chanteursaison"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>

                        <div className="concert-title-content">

                            <h2 className="concert-titre">
                                {concert.titre}
                            </h2>

                        </div>

                    </div>

                    {/* =================================
    INFORMATIONS CONCERT
   ================================= */}

                    <div className="concert-informations">

                        <div className="concert-information">

                            <span className="concert-information-icon">
                                📅
                            </span>

                            <div className="concert-information-content">

                                <strong>
                                    {concert.date
                                        ? new Date(
                                            concert.date
                                        ).toLocaleDateString(
                                            "fr-FR",
                                            {
                                                weekday: "long",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric"
                                            }
                                        )
                                        : "Date non définie"
                                    }
                                </strong>

                                {concert.heure_debut && (
                                    <small>
                                        🕐 {concert.heure_debut}
                                    </small>
                                )}

                            </div>

                        </div>

                        <div className="concert-information">

                            <span className="concert-information-icon">
                                📍
                            </span>

                            <a
                                className="concert-information-link"
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    [
                                        concert.lieux?.rue,
                                        concert.lieux?.code_postale,
                                        concert.lieux?.ville
                                    ]
                                        .filter(Boolean)
                                        .join(", ")
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >

                                <div className="concert-information-content">

                                    <strong>
                                        {concert.lieux?.nom || "Lieu non défini"}
                                    </strong>

                                    {(concert.lieux?.rue ||
                                        concert.lieux?.code_postale ||
                                        concert.lieux?.ville) && (

                                            <small>
                                                {[
                                                    concert.lieux?.rue,
                                                    concert.lieux?.code_postale,
                                                    concert.lieux?.ville
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </small>

                                        )}

                                </div>

                            </a>

                        </div>

                    </div>

                    {/* =================================
                        PARTICIPATION
                       ================================= */}

                    {passed ? (
                        <ParticipationEtat participation={concert.participation} />
                    ) : (
                        <ConcertParticipation
                            concert={concert}
                            onParticipationChange={(concertId, participation) => {
                                setConcerts(current =>
                                    current.map(item =>
                                        item.id === concertId
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


    /*
     * =====================================================
     * PAGE
     * =====================================================
     */

    return (
        <main className="chansons-page concerts-page">

            {/* =================================================
                EN-TÊTE
               ================================================= */}

            <EspaceChanteurPageHeader
                title="Mes Concerts"
                subtitle="liste des concerts et suivi de mes participations."
                count={concerts.length}
                iconClass="icon-concert"
                singular="concert"
                plural="concerts"
            />


            {/* =================================================
                MESSAGE D'ERREUR
               ================================================= */}

            {error && (

                <div className="concerts-error">

                    <span className="concerts-error-icon">
                        ⚠️
                    </span>

                    <span>
                        {error}
                    </span>

                </div>

            )}

            {/* =================================================
                AIDE
               ================================================= */}

            <div className="concerts-help">

                <span className="concerts-help-icon">
                    📅
                </span>

                <div>

                    <strong>
                        Votre participation
                    </strong>

                    <span>
                        Consultez l'état de votre participation
                        à chaque concert.
                    </span>

                </div>

            </div>

            {/* =================================================
                LISTE DES CONCERTS
               ================================================= */}

            <div className="liste_rendezvous_groups">

                {/* ============================= */}
                {/* CONCERTS PASSÉS              */}
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
                                Passés
                            </span>

                            <span className="liste_rendezvous_group_count">
                                {concertsPasses.length}
                            </span>
                        </span>

                        <span className="liste_rendezvous_group_chevron">
                            {showPast ? "▲" : "▼"}
                        </span>
                    </button>

                    {showPast && (
                        <section className="liste_rendezvous_group_list">

                            {concertsPasses.length > 0 ? (
                                concertsPasses.map(
                                    renderConcert
                                )
                            ) : (
                                <div className="liste_rendezvous_group_empty">
                                    Aucun concert passé.
                                </div>
                            )}

                        </section>
                    )}

                </div>


                {/* ============================= */}
                {/* CONCERTS À VENIR             */}
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
                                {concertsAVenir.length}
                            </span>
                        </span>

                        <span className="liste_rendezvous_group_chevron">
                            {showUpcoming ? "▲" : "▼"}
                        </span>
                    </button>

                    {showUpcoming && (
                        <section className="liste_rendezvous_group_list">

                            {concertsAVenir.length > 0 ? (
                                concertsAVenir.map(
                                    renderConcert
                                )
                            ) : (
                                <div className="liste_rendezvous_group_empty">
                                    Aucun concert à venir.
                                </div>
                            )}

                        </section>
                    )}

                </div>

            </div>

            {/* =================================================
    POPIN CHANSONS DU CONCERT
   ================================================= */}

            {concertChansonsOpen && (() => {

                const concert =
                    concerts.find(
                        item => item.id === concertChansonsOpen
                    );

                const chansons =
                    concertChansons[concertChansonsOpen] || [];

                const chansonsTriees = [...chansons].sort(
                    (a, b) => {

                        if (a.ordre == null) return 1;
                        if (b.ordre == null) return -1;

                        return a.ordre - b.ordre;
                    }
                );

                return (
                    <div
                        className="concert-chansons-overlay"
                        onClick={handleCloseChansons}
                    >

                        <div
                            className="concert-chansons-modal"
                            onClick={event => event.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="concert-chansons-title"
                        >

                            {/* ================================
                    EN-TÊTE POPIN
                   ================================= */}

                            <header className="concert-chansons-modal-header">

                                <div className="concert-chansons-modal-title-wrapper">

                                    <div className="concert-chansons-modal-icon">
                                        🎵
                                    </div>

                                    <div>

                                        <div className="concert-chansons-modal-eyebrow">
                                            Programme
                                        </div>

                                        <h2
                                            id="concert-chansons-title"
                                            className="concert-chansons-modal-title"
                                        >
                                            {concert?.titre || "Concert"}
                                        </h2>

                                    </div>

                                </div>

                                <button
                                    type="button"
                                    className="concert-chansons-close"
                                    onClick={handleCloseChansons}
                                    aria-label="Fermer"
                                    title="Fermer"
                                >
                                    ×
                                </button>

                            </header>

                            {/* ================================
                    CONTENU
                   ================================= */}

                            <div className="concert-chansons-modal-content">

                                {chansonsTriees.length === 0 ? (

                                    <div className="concert-chansons-empty">

                                        <div className="concert-chansons-empty-icon">
                                            🎶
                                        </div>

                                        <strong>
                                            Aucune chanson
                                        </strong>

                                        <span>
                                            Aucune chanson n'est actuellement
                                            associée à ce concert.
                                        </span>

                                    </div>

                                ) : (

                                    <div className="concert-chansons-list">

                                        {chansonsTriees.map(
                                            (chanson, index) => {

                                                const titre =
                                                    chanson
                                                        .saison_chansons
                                                        ?.chansons
                                                        ?.titre ||
                                                    "Titre inconnu";

                                                const chansonId =
                                                    chanson
                                                        .saison_chansons
                                                        ?.chansons
                                                        ?.id;

                                                return (
                                                    <Link
                                                        key={chanson.id}
                                                        to={`/chanteur/${token}/chansons?chanson=${chansonId}`}
                                                        className="concert-chanson-item"
                                                    >

                                                        <div className="concert-chanson-number">
                                                            {chanson.ordre ?? index + 1}
                                                        </div>

                                                        <div className="concert-chanson-content">

                                                            <span className="concert-chanson-title">
                                                                {titre}
                                                            </span>

                                                        </div>

                                                        <span className="concert-chanson-arrow">
                                                            ›
                                                        </span>

                                                    </Link>
                                                );
                                            }
                                        )}

                                    </div>

                                )}

                            </div>

                            {/* ================================
                    PIED
                   ================================= */}

                            <footer className="concert-chansons-modal-footer">

                                <span>
                                    {chansonsTriees.length}{" "}
                                    {chansonsTriees.length > 1
                                        ? "chansons"
                                        : "chanson"}
                                </span>

                                <button
                                    type="button"
                                    className="concert-chansons-close-button"
                                    onClick={handleCloseChansons}
                                >
                                    Fermer
                                </button>

                            </footer>

                        </div>

                    </div>
                );

            })()}

            {concertRepartitionOpen && (() => {

                const concert =
                    concerts.find(
                        item =>
                            item.id ===
                            concertRepartitionOpen
                    );


                if (!concert) {
                    return null;
                }


                const chansons =
                    concertChansons[
                    concertRepartitionOpen
                    ] || [];


                /*
                 * On conserve l'ordre du concert.
                 */

                const chansonsTriees =
                    [...chansons].sort(
                        (a, b) => {

                            if (a.ordre == null) {
                                return 1;
                            }

                            if (b.ordre == null) {
                                return -1;
                            }

                            return (
                                a.ordre -
                                b.ordre
                            );
                        }
                    );


                /*
                 * RepresentationsChoeur accepte :
                 *
                 * {
                 *     chanson_id,
                 *     chansons: {
                 *         id,
                 *         titre
                 *     }
                 * }
                 *
                 * donc on extrait saison_chansons.
                 */

                const chansonsRepresentation =
                    chansonsTriees
                        .map(
                            item =>
                                item.saison_chansons
                        )
                        .filter(Boolean);


                const saisonConcertId =
                    concert
                        .saison_rendezvous
                        ?.[0]
                        ?.id;


                return (

                    <div
                        className="concert-chansons-overlay"

                        onClick={() =>
                            setConcertRepartitionOpen(
                                null
                            )
                        }
                    >

                        <div
                            className="
                    concert-chansons-modal
                    concert-repartition-modal
                "

                            onClick={
                                event =>
                                    event.stopPropagation()
                            }

                            role="dialog"

                            aria-modal="true"
                        >

                            <header
                                className="
                        concert-chansons-modal-header
                    "
                            >

                                <div
                                    className="
                            concert-chansons-modal-title-wrapper
                        "
                                >

                                    <div
                                        className="concert-chansons-modal-icon icon-chanteursaison"
                                    />



                                    <div>

                                        <div
                                            className="
                                    concert-chansons-modal-eyebrow
                                "
                                        >
                                            Répartition
                                        </div>


                                        <h2
                                            className="
                                    concert-chansons-modal-title
                                "
                                        >
                                            {concert.titre}
                                        </h2>

                                    </div>

                                </div>


                                <button
                                    type="button"

                                    className="
                            concert-chansons-close
                        "

                                    onClick={() =>
                                        setConcertRepartitionOpen(
                                            null
                                        )
                                    }

                                    aria-label="Fermer"

                                    title="Fermer"
                                >
                                    ×
                                </button>

                            </header>


                            <div
                                className="
                        concert-chansons-modal-content
                    "
                            >

                                <RepresentationsChoeur

                                    exportexcel={
                                        false
                                    }
                                    exportFileName={
                                        concert.titre
                                    }
                                    chansons={
                                        chansonsRepresentation
                                    }

                                    saisonConcertId={
                                        saisonConcertId
                                    }

                                    chanteurId={
                                        chanteurId
                                    }

                                />

                            </div>


                            <footer
                                className="
                        concert-chansons-modal-footer
                    "
                            >

                                <span>
                                    {
                                        chansonsRepresentation
                                            .length
                                    }{" "}

                                    {
                                        chansonsRepresentation
                                            .length > 1
                                            ? "chansons"
                                            : "chanson"
                                    }
                                </span>


                                <button
                                    type="button"

                                    className="
                            concert-chansons-close-button
                        "

                                    onClick={() =>
                                        setConcertRepartitionOpen(
                                            null
                                        )
                                    }
                                >
                                    Fermer
                                </button>

                            </footer>

                        </div>

                    </div>
                );

            })()}

        </main>
    );
}