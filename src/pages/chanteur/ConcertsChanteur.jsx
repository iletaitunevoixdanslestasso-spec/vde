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
                                        🎵
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

        </main>
    );
}