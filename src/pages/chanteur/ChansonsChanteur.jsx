import { useEffect, useState } from "react";


import { saisonchanteurpupitreConfig } from "../../config/entities/saisonchanteurpupitre.config";
import { Link } from "react-router-dom";


export default function ChansonsChanteur() {

    const [chansons, setChansons] = useState([]);

    const data = JSON.parse(
        localStorage.getItem("chanteur")
    );

    const saisonId = data?.saisonId;
    const chanteurId = data?.chanteur?.chanteur_id;
    const token = localStorage.getItem("token");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState(null);






    const controller =
        saisonchanteurpupitreConfig.controller;
    console.log(
        "REPOSITORY CONFIG :",
        saisonchanteurpupitreConfig.repository
    );

    console.log(
        "SAVE PUPITRE TYPE :",
        typeof saisonchanteurpupitreConfig.repository.savePupitre
    );

    console.log(
        "SERVICE :",
        saisonchanteurpupitreConfig.service
    );

    /*
     * Chargement des chansons
     */
    useEffect(() => {

        if (!saisonId || !chanteurId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        console.log("DATA :", data);
        console.log("SAISON ID :", saisonId);
        console.log("CHANTEUR ID :", chanteurId);
        console.log("TOKEN URL :", window.location.pathname);
        controller.getMesChansons(
            token,
            saisonId,
            chanteurId,

            (result) => {

                console.log("RESULTAT getMesChansons :", result);



                setChansons(
                    result || []
                );

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

    }, [saisonId, chanteurId]);


    /*
     * Modification du pupitre
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

                const nouveauChoix =
                    result;

                setChansons(current =>
                    current.map(chanson => {

                        if (
                            chanson.chanson_id !==
                            chansonId
                        ) {
                            return chanson;
                        }
                        // 🔎 Recherche du pupitre sélectionné
                        const nouveauPupitre = chanson.pupitres.find(
                            pupitre => pupitre.pupitre_id === nouveauChoix.pupitre_id
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
                            // 🎵 Nouveau son correspondant au pupitre
                            audio_pupitre: nouveauPupitre
                                ? {
                                    id: nouveauPupitre.id,
                                    pupitres: nouveauPupitre.pupitres,
                                    audio_url: nouveauPupitre.audio_url,
                                    pupitre_id: nouveauPupitre.pupitre_id,
                                    nom: nouveauPupitre.nom
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
     * Chargement
     */
    if (loading) {

        return (
            <div>
                <h1>🎵 Mes chansons</h1>
                <p>Chargement...</p>
            </div>
        );
    }


    /*
     * Pas de saison
     */
    if (!saisonId) {

        return (
            <div>
                <h1>🎵 Mes chansons</h1>

                <p>
                    Aucune saison active.
                </p>
            </div>
        );
    }


    /*
     * Pas de chansons
     */
    if (!chansons.length) {

        return (
            <div>
                <h1>🎵 Mes chansons</h1>

                <p>
                    Aucune chanson n'est actuellement
                    disponible pour cette saison.
                </p>
            </div>
        );
    }


    return (
        <div>

            <h1>🎵 Mes chansons</h1>

            <p>
                Choisissez le pupitre que vous chantez
                pour chaque chanson.
            </p>


            {error && (

                <div
                    style={{
                        color: "red",
                        marginBottom: "15px"
                    }}
                >
                    {error}
                </div>

            )}


            <div>

                {chansons.map(chanson => {

                    const pupitreChoisi =
                        chanson.pupitreChoisi
                            ?.pupitre_id || "";

                    const isSaving =
                        saving === chanson.chanson_id;

                    return (
                        <div
                            key={chanson.chanson_id}
                            className="chanson-card"
                        >
                            <div className="chanson-row">

                                {/* Titre */}
                                <div className="chanson-titre">
                                    <strong>
                                        {chanson.titre}
                                    </strong>
                                </div>

                                {/* Partition / document */}
                                <div className="chanson-document">
                                    <Link
                                        className="icon-documents"
                                        to={chanson.documentUrl}
                                        target="_blank"
                                    >
                                        {chanson.path}
                                    </Link>
                                </div>

                                {/* Pupitre */}
                                <div className="chanson-pupitre">

                                    <select
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
                                            -- Choisir un pupitre --
                                        </option>

                                        {chanson.pupitres.map((pupitre) => (
                                            <option
                                                key={pupitre.id}
                                                value={pupitre.id}
                                            >
                                                {pupitre.nom}
                                            </option>
                                        ))}
                                    </select>

                                    {isSaving && (
                                        <span className="chanson-saving">
                                            Enregistrement...
                                        </span>
                                    )}

                                </div>

                                {/* Audio */}
                                <div className="chanson-audio">

                                    {chanson?.audio_pupitre?.audio_url && (
                                        <Link
                                            className="icon-chansons"
                                            to={chanson.audio_pupitre.audio_url}
                                            target="_blank"
                                        >
                                            Son de {chanson.audio_pupitre.nom}
                                        </Link>
                                    )}

                                </div>

                            </div>
                        </div>
                    );
                    return (

                        <div
                            key={chanson.chanson_id}
                            style={{
                                padding: "15px",
                                marginBottom: "10px",
                                border: "1px solid #ddd",
                                borderRadius: "8px"
                            }}
                        >

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems: "center",
                                    gap: "20px"
                                }}
                            >
                                <div>

                                    <strong>
                                        {chanson.titre}
                                    </strong>
                                </div>
                                <div>
                                    {<Link
                                        to={`${chanson.documentUrl}`}
                                        target="_blank"
                                    // className="todo-button"
                                    >
                                        <span className=""></span>
                                        {chanson.path}.
                                    </Link>}
                                </div>
                                <div>


                                    <select
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
                                            -- Choisir un pupitre --
                                        </option>


                                        {chanson.pupitres.map(
                                            pupitre => (

                                                <option
                                                    key={
                                                        pupitre.id
                                                    }
                                                    value={
                                                        pupitre.id
                                                    }
                                                >
                                                    {pupitre.nom}
                                                </option>

                                            )
                                        )}

                                    </select>


                                    {isSaving && (

                                        <span>
                                            Enregistrement...
                                        </span>

                                    )}
                                </div>
                                <div>
                                    {chanson?.audio_pupitre && chanson.audio_pupitre?.audio_url && <Link
                                        to={`${chanson?.audio_pupitre?.audio_url}`}
                                        target="_blank"
                                    // className="todo-button"
                                    >
                                        <span className=""></span>
                                        son de {chanson?.audio_pupitre?.nom}.
                                    </Link>}
                                </div>

                            </div>

                        </div>

                    );

                })}

            </div>

        </div>
    );
}