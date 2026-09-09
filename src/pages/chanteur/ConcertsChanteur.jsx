import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "../../styles/espaceChanteur_concerts.css";
import { saisonconcertConfig } from "../../config/entities/saisonconcert.config";
import { useChanteur } from "../../components/contexts/ChanteurContext";
import NotificationService from "../../services/NotificationService";
import ConcertParticipation from "../../components/ConcertParticipation";

export default function ConcertsChanteur() {

    const [concerts, setConcerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [concertChansons, setConcertChansons] = useState({});
    const [chansonsLoading, setChansonsLoading] = useState(null);
    const [concertChansonsOpen, setConcertChansonsOpen] = useState(null);

    const [error, setError] = useState(null);
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



    const handleShowChansons_old = async (concert) => {

        const saisonRendezvousId = concert.saison_rendezvous[0] ? concert.saison_rendezvous[0].id : false;
        console.log('concert', concert)
        if (!saisonRendezvousId) {
            console.error("saison_rendezvous_id absent", concert);
            return;
        }

        setChansonsLoading(concert.id);

        controller.getChansonsConcert(
            token,
            saisonRendezvousId,
            (result) => {
                setConcertChansons(current => ({
                    ...current,
                    [concert.id]: result || []
                }));

                setChansonsLoading(null);
            },
            (err) => {
                console.error("Erreur chargement chansons", err);
                setChansonsLoading(null);
            }
        );
    };

    const handleShowChansons = async (concert) => {

        const saisonRendezvousId =
            concert.saison_rendezvous?.[0]?.id;

        console.log("concert", concert);

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

            console.log("chansons concert", result);
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
                console.log("result", result)
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
            <main className="concerts-page">

                <header className="concerts-page-header">

                    <div className="concerts-page-header-icon">
                        🎵
                    </div>

                    <div>

                        <div className="concerts-page-eyebrow">
                            Mon espace
                        </div>

                        <h1 className="concerts-page-title">
                            Mes concerts
                        </h1>

                        <p className="concerts-page-subtitle">
                            Chargement de vos concerts...
                        </p>

                    </div>

                </header>

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
            <main className="concerts-page">

                <header className="concerts-page-header">

                    <div className="concerts-page-header-icon">
                        🎵
                    </div>

                    <div>

                        <div className="concerts-page-eyebrow">
                            Mon espace
                        </div>

                        <h1 className="concerts-page-title">
                            Mes concerts
                        </h1>

                    </div>

                </header>

                <div className="concerts-empty">

                    <div className="concerts-empty-icon">
                        📅
                    </div>

                    <div>

                        <strong>
                            Aucune saison active
                        </strong>

                        <p>
                            Aucune saison n'est actuellement
                            disponible.
                        </p>

                    </div>

                </div>

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
            <main className="concerts-page">

                <header className="concerts-page-header">

                    <div className="concerts-page-header-icon">
                        🎵
                    </div>

                    <div>

                        <div className="concerts-page-eyebrow">
                            Mon espace
                        </div>

                        <h1 className="concerts-page-title">
                            Mes concerts
                        </h1>

                        <p className="concerts-page-subtitle">
                            Les concerts disponibles pour
                            cette saison apparaîtront ici.
                        </p>

                    </div>

                </header>

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

    /*
     * =====================================================
     * PAGE
     * =====================================================
     */

    return (
        <main className="concerts-page">

            {/* =================================================
                EN-TÊTE
               ================================================= */}

            <header className="concerts-page-header">

                <div className="concerts-page-header-icon">
                    🎵
                </div>

                <div className="concerts-page-header-content">

                    <div className="concerts-page-eyebrow">
                        Mon espace
                    </div>

                    <h1 className="concerts-page-title">
                        Mes concerts
                    </h1>

                    <p className="concerts-page-subtitle">
                        Retrouvez vos concerts et indiquez
                        votre participation.
                    </p>

                </div>

                <div className="concerts-page-count">

                    <strong>
                        {concerts.length}
                    </strong>

                    <span>
                        {concerts.length > 1
                            ? "concerts"
                            : "concert"}
                    </span>

                </div>

            </header>

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
                        Confirmez votre participation
                    </strong>

                    <span>
                        Indiquez si vous participez ou non
                        à chaque concert.
                    </span>

                </div>

            </div>

            {/* =================================================
                LISTE DES CONCERTS
               ================================================= */}

            <section className="concerts-list">

                {concerts.map(concert => {

                    const isSaving =
                        saving === concert.id;

                    const participationValue =
                        concert.participation === null ||
                            concert.participation === undefined
                            ? ""
                            : String(concert.participation);

                    return (
                        <article
                            key={concert.id}
                            className="concert-card"
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
                                                "🎵"
                                            )}
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

                                <ConcertParticipation
                                    concert={concert}
                                    // token={token}
                                    // chanteur={chanteur}
                                    // controller={controller}
                                    onParticipationChange={(concertId, participation) => {
                                        console.log("participation", participation)
                                        setConcerts(current =>
                                            current.map(item =>
                                                item.id === concertId
                                                    ? { ...item, participation }
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

                                                return (
                                                    <div
                                                        key={chanson.id}
                                                        className="concert-chanson-item"
                                                    >

                                                        <div className="concert-chanson-number">
                                                            {chanson.ordre ??
                                                                index + 1}
                                                        </div>

                                                        <div className="concert-chanson-content">

                                                            <span className="concert-chanson-title">
                                                                {titre}
                                                            </span>

                                                        </div>

                                                        <span className="concert-chanson-arrow">
                                                            ›
                                                        </span>

                                                    </div>
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

        </main>
    );
}