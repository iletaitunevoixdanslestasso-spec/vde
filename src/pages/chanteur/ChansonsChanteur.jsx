import { useEffect, useState } from "react";


import { saisonchanteurpupitreConfig } from "../../config/entities/saisonchanteurpupitre.config";


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

                        return {
                            ...chanson,

                            pupitreChoisi: {
                                id: nouveauChoix.id,
                                pupitre_id:
                                    nouveauChoix.pupitre_id,
                                principal:
                                    nouveauChoix.principal
                            }
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

                                <strong>
                                    {chanson.titre}
                                </strong>


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

                        </div>

                    );

                })}

            </div>

        </div>
    );
}