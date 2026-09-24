import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Volume2, Music2 } from "lucide-react";

import { saisonchanteurpupitreConfig } from "../../config/entities/saisonchanteurpupitre.config";
import "../../styles/espaceChanteur_chansons.css";




function ChansonsPageHeader({ subtitle, count = null }) {
    return (
        <header className="chansons-page-header">

            <div className="chansons-page-header-icon">
                🎵
            </div>

            <div className="chansons-page-header-content">

                <div className="chansons-page-eyebrow">
                    Mon espace
                </div>

                <h1 className="chansons-page-title">
                    Mes chansons
                </h1>

                {subtitle && (
                    <p className="chansons-page-subtitle">
                        {subtitle}
                    </p>
                )}

            </div>

            {count !== null && (
                <div className="chansons-page-count">
                    <strong>
                        {count}
                    </strong>

                    <span>
                        {count > 1
                            ? "chansons"
                            : "chanson"}
                    </span>
                </div>
            )}

        </header>
    );
}









export default function ChansonsChanteur() {

    const [chansons, setChansons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState(null);

    const data = JSON.parse(
        localStorage.getItem("chanteur") || "null"
    );

    const [savingLead, setSavingLead] =
        useState(null);

    const saisonId = data?.saisonId;
    console.error("data", data)
    console.error("saisonId", saisonId)
    // const chanteurId = data?.chanteur?.chanteur_id;
    const chanteurId = data?.id;
    const token = localStorage.getItem("token");

    const controller =
        saisonchanteurpupitreConfig.controller;


    function handleLeadChange(chanson) {

        const nouveauLead = !chanson.lead;

        setSavingLead(
            chanson.saisonChansonId
        );

        setError(null);

        controller.saveLead(
            token,
            saisonId,
            chanteurId,
            chanson.saisonChansonId,
            nouveauLead,

            (result) => {

                setChansons(current =>
                    current.map(item => {

                        if (
                            item.saisonChansonId !==
                            chanson.saisonChansonId
                        ) {
                            return item;
                        }

                        return {
                            ...item,
                            lead: result.lead,
                            lead_id: result.id
                        };
                    })
                );

                setSavingLead(null);
            },

            (err) => {

                console.error(
                    "Erreur modification lead",
                    err
                );

                setError(
                    "Impossible d'enregistrer le lead."
                );

                setSavingLead(null);
            }
        );
    }

    /*
     * =====================================================
     * CHARGEMENT DES CHANSONS
     * =====================================================
     */

    useEffect(() => {

        if (!saisonId || !chanteurId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        controller.getMesChansons(
            token,
            saisonId,
            chanteurId,

            (result) => {

                setChansons(result || []);
                setLoading(false);
            },

            (err) => {

                console.error(
                    "Erreur chargement chansons",
                    err
                );

                setError(
                    "Impossible de charger vos chansons."
                );

                setLoading(false);
            }
        );

    }, [saisonId, chanteurId, token]);

    /*
     * =====================================================
     * MODIFICATION DU PUPITRE
     * =====================================================
     */

    function handlePupitreChange(
        chansonId,
        pupitreId
    ) {

        if (!pupitreId) {
            return;
        }

        setSaving(chansonId);
        setError(null);

        controller.savePupitre(
            token,
            saisonId,
            chanteurId,
            chansonId,
            pupitreId,

            (result) => {

                const nouveauChoix = result;

                setChansons(current =>
                    current.map(chanson => {

                        if (
                            chanson.chanson_id !==
                            chansonId
                        ) {
                            return chanson;
                        }

                        const nouveauPupitre =
                            chanson.pupitres?.find(
                                pupitre =>
                                    pupitre.pupitre_id ===
                                    nouveauChoix.pupitre_id
                            );

                        return {
                            ...chanson,

                            pupitreChoisi: {
                                id: nouveauChoix.id,
                                pupitre_id:
                                    nouveauChoix.pupitre_id,
                                principal:
                                    nouveauChoix.principal
                            },

                            audio_pupitre:
                                nouveauPupitre
                                    ? {
                                        id:
                                            nouveauPupitre.id,
                                        pupitres:
                                            nouveauPupitre.pupitres,
                                        audio_url:
                                            nouveauPupitre.audio_url,
                                        pupitre_id:
                                            nouveauPupitre.pupitre_id,
                                        nom:
                                            nouveauPupitre.nom
                                    }
                                    : null
                        };
                    })
                );

                setSaving(null);
            },

            (err) => {

                console.error(
                    "Erreur modification pupitre",
                    err
                );

                setError(
                    "Impossible d'enregistrer votre pupitre."
                );

                setSaving(null);
            }
        );
    }

    /*
     * =====================================================
     * CHARGEMENT
     * =====================================================
     */

    if (loading) {

        return (
            <main className="chansons-page">

                <ChansonsPageHeader
                    subtitle="Chargement de vos chansons..."
                />

                <div className="chansons-loading">
                    <span className="chansons-loading-icon">
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
            <main className="chansons-page">

                <ChansonsPageHeader />

                <div className="chansons-empty">
                    GROS PROBLEME DE CONF
                </div>

            </main>
        );
    }

    /*
     * =====================================================
     * AUCUNE CHANSON
     * =====================================================
     */

    if (!chansons.length) {

        return (
            <main className="chansons-page">


                <ChansonsPageHeader
                    subtitle="Les chansons disponibles pour cette saison apparaîtront ici."
                />

                <div className="chansons-empty">
                    <div className="chansons-empty-icon">
                        🎶
                    </div>

                    <div>
                        <strong>
                            Aucune chanson disponible
                        </strong>

                        <p>
                            Aucune chanson n'est actuellement
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
        <main className="chansons-page">

            {/* =================================================
                EN-TÊTE
               ================================================= */}

            <ChansonsPageHeader
                subtitle="Retrouvez vos chansons, choisissez votre pupitre et accédez aux paroles et aux fichiers audio."
                count={chansons.length}
            />

            {/* =================================================
                MESSAGE D'ERREUR
               ================================================= */}

            {error && (

                <div className="chansons-error">
                    <span className="chansons-error-icon">
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

            <div className="chansons-help">

                <span className="chansons-help-icon">
                    🎤
                </span>

                <div>
                    <strong>
                        Je choisis mon pupitre
                    </strong>

                    <span>
                        Le fichier audio sera automatiquement
                        adapté au pupitre sélectionné.
                    </span>
                </div>

            </div>

            {/* =================================================
                LISTE DES CHANSONS
               ================================================= */}

            <section className="chansons-list">

                {chansons.map(chanson => {

                    const pupitreChoisi =
                        chanson.pupitreChoisi?.pupitre_id || "";

                    const isSaving =
                        saving === chanson.chanson_id;

                    const audioDisponible =
                        Boolean(
                            chanson?.audio_pupitre?.audio_url
                        );

                    return (
                        <article
                            key={chanson.chanson_id}
                            className="chanson-card"
                        >

                            <div className="chanson-row">

                                {/* =================================
                                    TITRE
                                   ================================= */}

                                <div className="chanson-main">

                                    {chanson.audio ? (
                                        <a
                                            className="chanson-icon chanson-icon-audio"
                                            href={chanson.audio}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Écouter la chanson"
                                        >
                                            <Music2
                                                size={24}
                                                strokeWidth={2.2}
                                                className="chanson-audio-note"
                                            />
                                            <Volume2
                                                size={24}
                                                strokeWidth={2.2}
                                                className="chanson-audio-volume"
                                            />
                                        </a>
                                    ) : (
                                        <div className="chanson-icon">
                                            <Music2 size={24} />
                                        </div>
                                    )}

                                    <div className="chanson-title-content">

                                        <h2 className="chanson-titre">
                                            {chanson.titre}
                                        </h2>

                                        <button
                                            type="button"
                                            className={`chanson-lead-button ${chanson.lead ? "selected" : ""
                                                }`}
                                            onClick={() =>
                                                handleLeadChange( chanson )
                                            }
                                            title={
                                                chanson.lead
                                                    ? "Je fais un lead sur cette chanson"
                                                    : "Indiquer que je fais un lead"
                                            }
                                        >
                                            <span className="chanson-lead-icon">
                                                {chanson.lead ? "🎤⭐" : "🎤"}
                                            </span>

                                            <span className="chanson-lead-label">
                                                Lead
                                            </span>
                                        </button>

                                    </div>

                                </div>

                                {/* =================================
                                    PAROLES
                                   ================================= */}

                                <div className="chanson-document">

                                    {chanson.documentUrl ? (

                                        <Link
                                            className="chanson-action chanson-action-document"
                                            to={chanson.documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >

                                            <span className="chanson-action-icon">
                                                📄
                                            </span>

                                            <span className="chanson-action-content">

                                                <strong>
                                                    Paroles
                                                </strong>

                                                <small>
                                                    {chanson.path}
                                                </small>

                                            </span>

                                        </Link>

                                    ) : (

                                        <div className="chanson-action-disabled">
                                            <span>
                                                📄
                                            </span>

                                            <span>
                                                Paroles indisponibles
                                            </span>
                                        </div>

                                    )}

                                </div>

                                {/* =================================
                                    PUPITRE
                                   ================================= */}

                                <div className="chanson-pupitre">

                                    <label
                                        htmlFor={`pupitre-${chanson.chanson_id}`}
                                        className="chanson-pupitre-label"
                                    >
                                        Mon pupitre
                                    </label>

                                    <select
                                        id={`pupitre-${chanson.chanson_id}`}
                                        value={pupitreChoisi}
                                        disabled={isSaving}
                                        onChange={(event) =>
                                            handlePupitreChange(
                                                chanson.chanson_id,
                                                event.target.value
                                            )
                                        }
                                    >

                                        <option value="">
                                            Choisir un pupitre
                                        </option>

                                        {chanson.pupitres?.map(
                                            pupitre => (

                                                <option
                                                    key={pupitre.id}
                                                    value={pupitre.id}
                                                >
                                                    {pupitre.nom}
                                                </option>

                                            )
                                        )}

                                    </select>

                                    {isSaving && (

                                        <span className="chanson-saving">
                                            Enregistrement...
                                        </span>

                                    )}

                                </div>

                                {/* =================================
                                    AUDIO
                                   ================================= */}

                                <div className="chanson-audio">

                                    {audioDisponible ? (

                                        <Link
                                            className="chanson-action chanson-action-audio"
                                            to={chanson.audio_pupitre.audio_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >

                                            <span className="chanson-action-icon">
                                                <Volume2
                                                    size={24}
                                                    strokeWidth={2.2}
                                                    className="chanson-audio-volume"
                                                />
                                            </span>

                                            <span className="chanson-action-content">

                                                <strong>
                                                    Audio
                                                </strong>

                                                <small>
                                                    {chanson.audio_pupitre.nom}
                                                </small>

                                            </span>

                                        </Link>

                                    ) : (

                                        <div className="chanson-action-disabled">
                                            <span>
                                                🔊
                                            </span>

                                            <span>
                                                Choisissez un pupitre
                                            </span>
                                        </div>

                                    )}

                                </div>

                            </div>

                        </article>
                    );
                })}

            </section>

        </main>
    );
}