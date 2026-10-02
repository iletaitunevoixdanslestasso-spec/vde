import {
    useEffect,
    useMemo,
    useState
} from "react";

import RepresentationChoeurChanson
    from "./RepresentationChoeurChanson";

import RepresentationChoeurService
    from "../services/RepresentationChoeurService";
import ExcelService from "../services/ExcelService";


const service =
    new RepresentationChoeurService();


export default function RepresentationsChoeur({

    chansons = [],
    saisonConcertId = null,
    exportFileName = "Repartition",
    chanteurId = null,
    exportexcel = true
}) {

    const [representations, setRepresentations] =
        useState({});

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState(null);


    /*
     * Supporte plusieurs structures :
     *
     * chanson.id
     *
     * ou
     *
     * saisonChanson.chanson_id
     *
     * ou
     *
     * saisonChanson.chansons.id
     */

    const getChansonId = chanson =>

        chanson?.chanson_id ??
        chanson?.chansons?.id ??
        chanson?.id;


    const getTitre = chanson =>

        chanson?.chanson_titre ??
        chanson?.chansons?.titre ??
        chanson?.titre ??
        "";


    const chansonIds =
        useMemo(
            () =>
                chansons
                    .map(
                        getChansonId
                    )
                    .filter(Boolean),

            [chansons]
        );


    useEffect(() => {

        if (!chansonIds.length) {

            setRepresentations({});

            return;
        }


        const load = async () => {

            setLoading(true);
            setError(null);


            const response =
                await service
                    .getByChansons(
                        chansonIds,
                        saisonConcertId
                    );


            if (!response.success) {

                setError(
                    response.message
                );

                setLoading(false);

                return;
            }


            setRepresentations(
                response.data
            );


            setLoading(false);
        };


        load();

    }, [
        chansonIds.join("|"),
        saisonConcertId
    ]);


    if (loading) {

        return (
            <div>
                Chargement des chœurs...
            </div>
        );
    }


    if (error) {

        return (
            <div className="crud-errors">
                {error}
            </div>
        );
    }


    const handleExportExcel = async () => {

        const sheets =
            chansons
                .map(
                    (
                        chanson,
                        index
                    ) => {

                        const chansonId =
                            getChansonId(
                                chanson
                            );


                        const representation =
                            representations[
                            chansonId
                            ];


                        if (!representation) {
                            return null;
                        }


                        const pupitres =
                            representation.pupitres ||
                            [];


                        /*
                         * =============================================
                         * REGROUPEMENT DES CHANTEURS
                         * =============================================
                         *
                         * Un chanteur devient une ligne Excel.
                         */

                        const chanteursMap =
                            new Map();


                        pupitres.forEach(
                            pupitre => {

                                (
                                    pupitre.chanteurs ||
                                    []
                                ).forEach(
                                    chanteur => {

                                        const id =
                                            chanteur.id ||
                                            chanteur.chanteur_id;


                                        if (
                                            !chanteursMap.has(
                                                id
                                            )
                                        ) {

                                            chanteursMap.set(
                                                id,
                                                {
                                                    ...chanteur,

                                                    pupitreIds:
                                                        []
                                                }
                                            );
                                        }


                                        const item =
                                            chanteursMap.get(
                                                id
                                            );


                                        if (
                                            !item.pupitreIds.includes(
                                                pupitre.id
                                            )
                                        ) {

                                            item
                                                .pupitreIds
                                                .push(
                                                    pupitre.id
                                                );
                                        }
                                    }
                                );
                            }
                        );


                        /*
                         * =============================================
                         * TRI DES CHANTEURS
                         * =============================================
                         */

                        const data =
                            Array.from(
                                chanteursMap.values()
                            )
                                .sort(
                                    (a, b) => {

                                        const nomA =
                                            `${a.nom || ""} ${a.prenom || ""}`;

                                        const nomB =
                                            `${b.nom || ""} ${b.prenom || ""}`;


                                        return nomA.localeCompare(
                                            nomB,
                                            "fr"
                                        );
                                    }
                                );


                        /*
                         * =============================================
                         * COLONNES
                         * =============================================
                         *
                         * Choristes | Ténor | Alti | Soprano
                         */

                        const columns = [

                            {
                                field:
                                    "chanteur",

                                header:
                                    "Choristes",

                                exportValue:
                                    row =>
                                        `${row.nom || ""} ${row.prenom || ""}`
                                            .trim()
                            },


                            ...pupitres.map(
                                pupitre => ({

                                    field:
                                        `pupitre_${pupitre.id}`,

                                    header:
                                        pupitre.nom,

                                    exportValue:
                                        row =>
                                            row
                                                .pupitreIds
                                                .includes(
                                                    pupitre.id
                                                )
                                                ? "X"
                                                : ""
                                })
                            )
                        ];


                        /*
                         * Le titre fourni dans chansons
                         * est préférable car une chanson
                         * sans participant peut avoir une
                         * representation.titre vide.
                         */

                        const titre =
                            getTitre(
                                chanson
                            ) ||
                            representation.titre ||
                            `Chanson ${index + 1}`;


                        return {

                            sheetName:
                                titre,

                            data,

                            columns
                        };
                    }
                )
                .filter(Boolean);


        if (!sheets.length) {
            return;
        }


        await ExcelService.exportToExcelMultiSheets(
            sheets,
            {
                fileName:
                    exportFileName
            }
        );
    };


    return (

        <div
            className="representations-choeur"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "30px"
            }}
        >
            {exportexcel && (
                   <button
                    type="button"
                    className="data-table-action repartition-export-button"
                    onClick={
                        handleExportExcel
                    }
                >
                    <span
                        className="icon-telechargement"
                        aria-hidden="true"
                    />

                    <span className="data-table-action-label">
                        Exporter en Excel
                    </span>
                </button>
                
            ) }

             
            
            {chansons.map(
                chanson => {

                    const chansonId =
                        getChansonId(
                            chanson
                        );


                    if (!chansonId) {
                        return null;
                    }


                    return (

                        <RepresentationChoeurChanson

                            key={
                                chansonId
                            }

                            chansonId={
                                chansonId
                            }

                            titre={
                                getTitre(
                                    chanson
                                )
                            }

                            representation={
                                representations[
                                chansonId
                                ]
                            }

                            chanteurId={
                                chanteurId
                            }

                        />

                    );
                }
            )}

        </div>
    );
}