import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../../components/contexts/ConcertContext";
import { SaisonConcertChansonConfig } from "../../../../config/entities/SaisonConcertChanson.config";
import { useSaison } from "../../../../components/contexts/SaisonContext";

import RepresentationsChoeur
    from "../../../../components/RepresentationsChoeur";


export default function SaisonConcertChansonsPage() {

    const navigate = useNavigate();

    const {
        concertSelectionne
    } = useConcert();

    const {
        saisonSelectionne
    } = useSaison();


    /*
     * =========================================================
     * POPUP REPRESENTATIONS
     * =========================================================
     */

    const [popupRepartition, setPopupRepartition] =
        useState(false);

    const [chansonsConcert, setChansonsConcert] =
        useState([]);

    const [loadingRepartition, setLoadingRepartition] =
        useState(false);

    const [erreurRepartition, setErreurRepartition] =
        useState(null);


    /*
     * =========================================================
     * REDIRECTION
     * =========================================================
     */

    useEffect(() => {

        if (
            !saisonSelectionne ||
            !concertSelectionne
        ) {

            navigate("/admin");

            return;
        }

    }, [
        saisonSelectionne,
        concertSelectionne,
        navigate
    ]);


    /*
     * =========================================================
     * OUVERTURE REPARTITION
     * =========================================================
     */

    const afficherRepartitions = async () => {

        const saisonConcertId =
            concertSelectionne
                ?.saison_rendezvous?.[0]
                ?.id;


        if (!saisonConcertId) {
            return;
        }


        setLoadingRepartition(true);
        setErreurRepartition(null);


        const {
            data,
            error
        } = await supabase

            .from(
                "saison_concert_chansons"
            )

            .select(`
                *,
                saison_chansons!inner(
                    *,
                    chansons(
                        *
                    )
                )
            `)

            .is(
                "deleted_at",
                null
            )

            .eq(
                "saison_rendezvous_id",
                saisonConcertId
            )

            .is(
                "saison_chansons.deleted_at",
                null
            )

            .is(
                "saison_chansons.chansons.deleted_at",
                null
            )

            .order(
                "ordre",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Erreur chargement chansons concert",
                error
            );

            setErreurRepartition(
                error.message
            );

            setLoadingRepartition(false);

            return;
        }


        /*
         * Transformation :
         *
         * saison_concert_chansons
         *      ↓
         * saison_chansons
         *      ↓
         * chansons
         *
         * devient :
         *
         * [
         *   { id, titre },
         *   { id, titre }
         * ]
         */

        const chansons =
            (data || [])
                .map(
                    item =>
                        item
                            ?.saison_chansons
                            ?.chansons
                )
                .filter(Boolean);


        console.log(
            "chansons pour représentation",
            chansons
        );


        setChansonsConcert(
            chansons
        );

        setLoadingRepartition(false);

        setPopupRepartition(true);
    };


    /*
     * IMPORTANT :
     * empêche le rendu avant la redirection
     */

    if (
        !saisonSelectionne ||
        !concertSelectionne
    ) {

        return null;
    }


    return (

        <>

            {/* ================================================
                BOUTON REPARTITION COMPLETE
                ================================================ */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "15px"
                }}
            >

                <button

                    type="button"

                    className="
                        data-table-action
                        repartition-export-button
                    "

                    onClick={
                        afficherRepartitions
                    }

                >

                    <span
                        className="icon-chanteursaison"
                        aria-hidden="true"
                    />

                    <span className="data-table-action-label">

                        Répartition du chœur

                    </span>

                </button>

            </div>


            {/* ================================================
                CRUD CHANSONS DU CONCERT
                ================================================ */}

            <CRUDPage

                config={{
                    ...SaisonConcertChansonConfig,

                    title:
                        `Les chansons pour ${concertSelectionne.titre}`
                }}

                context={{

                    saisonId:
                        saisonSelectionne.id,

                    concertId:
                        concertSelectionne.id,

                    saisonConcertId:
                        concertSelectionne
                            ?.saison_rendezvous?.[0]
                            ?.id

                }}

            />


            {/* ================================================
                POPUP REPRESENTATIONS CHOEUR
                ================================================ */}

            {popupRepartition && (

                <div

                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.55)",
                        zIndex: 9999,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "20px"
                    }}

                    onClick={() =>
                        setPopupRepartition(false)
                    }

                >

                    <div

                        style={{
                            background: "white",
                            width: "95%",
                            maxWidth: "1200px",
                            maxHeight: "95vh",
                            overflowY: "auto",
                            borderRadius: "12px",
                            padding: "20px",
                            position: "relative"
                        }}

                        onClick={event =>
                            event.stopPropagation()
                        }

                    >

                        {/* FERMER */}

                        <button

                            type="button"

                            onClick={() =>
                                setPopupRepartition(false)
                            }

                            style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                border: 0,
                                background: "transparent",
                                fontSize: "28px",
                                cursor: "pointer",
                                zIndex: 10
                            }}

                            title="Fermer"

                        >
                            ×
                        </button>


                        <h2>
                            Répartition du chœur
                        </h2>

                        <div
                            style={{
                                marginBottom: "25px"
                            }}
                        >

                            {concertSelectionne.titre}

                        </div>


                        {/* CHARGEMENT */}

                        {loadingRepartition && (

                            <div>
                                Chargement...
                            </div>

                        )}


                        {/* ERREUR */}

                        {erreurRepartition && (

                            <div className="crud-errors">

                                {erreurRepartition}

                            </div>

                        )}


                        {/* REPRESENTATIONS */}

                        {!loadingRepartition &&
                            !erreurRepartition && (

                                <RepresentationsChoeur

                                    chansons={
                                        chansonsConcert
                                    }
                                    saisonConcertId={
                                        concertSelectionne
                                            ?.saison_rendezvous?.[0]
                                            ?.id
                                    }
                                    exportFileName={
                                        `Repartition_${concertSelectionne.titre}`
                                    }

                                />

                            )}

                    </div>

                </div>

            )}

        </>

    );
}