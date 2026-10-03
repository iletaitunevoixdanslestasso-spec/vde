import { useRef, useState } from "react";

import ExcelJS from "exceljs/dist/exceljs.min.js";

import { supabase } from "../core/supabase/client";

import { useSaison } from "./contexts/SaisonContext";


export default function ImportRepetitionsExcel({
    saisonId,
    onImported
}) {

    const fileInputRef =
        useRef(null);


    const {
        saisonSelectionne,
        saisonActive
    } = useSaison();


    const [fichier, setFichier] =
        useState(null);


    const [lignes, setLignes] =
        useState([]);


    const [
        erreursLecture,
        setErreursLecture
    ] =
        useState([]);


    const [loading, setLoading] =
        useState(false);


    const [resultat, setResultat] =
        useState(null);


    /*
     * =========================================================
     * NORMALISATION ENTETE
     * =========================================================
     */

    function normaliserEntete(value) {

        return String(
            value || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .toLowerCase();

    }


    /*
     * =========================================================
     * LECTURE DU FICHIER EXCEL
     * =========================================================
     */

    const handleFileChange = async (
        event
    ) => {

        const file =
            event.target.files?.[0];


        setFichier(null);

        setLignes([]);

        setErreursLecture([]);

        setResultat(null);


        if (!file) {

            return;

        }


        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        if (extension !== "xlsx") {

            setErreursLecture([

                "Le fichier doit être un fichier Excel au format .xlsx."

            ]);


            return;

        }


        setFichier(file);


        try {

            /*
             * -------------------------------------------------
             * CHARGEMENT EXCELJS
             * -------------------------------------------------
             */

            const buffer =
                await file.arrayBuffer();


            const workbook =
                new ExcelJS.Workbook();


            await workbook.xlsx.load(
                buffer
            );


            if (
                !workbook.worksheets.length
            ) {

                setErreursLecture([

                    "Le fichier Excel ne contient aucune feuille."

                ]);


                return;

            }


            const worksheet =
                workbook.worksheets[0];


            if (
                worksheet.actualRowCount ===
                0
            ) {

                setErreursLecture([

                    "La feuille Excel ne contient aucune donnée."

                ]);


                return;

            }


            /*
             * =================================================
             * RECHERCHE DES COLONNES
             * =================================================
             *
             * Attention :
             *
             * le fichier possède deux colonnes
             * portant exactement le même nom :
             *
             * accompagnée
             *
             * On conserve donc un TABLEAU de positions
             * pour chaque en-tête.
             * =================================================
             */

            const headerRow =
                worksheet.getRow(1);


            const colonnes = {};


            headerRow.eachCell(

                {
                    includeEmpty: false
                },

                (
                    cell,
                    columnNumber
                ) => {

                    const nomColonne =
                        normaliserEntete(
                            getCellText(
                                cell
                            )
                        );


                    if (!nomColonne) {

                        return;

                    }


                    if (
                        !colonnes[
                        nomColonne
                        ]
                    ) {

                        colonnes[
                            nomColonne
                        ] = [];

                    }


                    colonnes[
                        nomColonne
                    ].push(
                        columnNumber
                    );

                }

            );


            console.log(
                "Colonnes Excel répétitions :",
                colonnes
            );


            /*
             * =================================================
             * COLONNES
             * =================================================
             */

            const colonneDate =
                colonnes.date?.[0];


            const colonneType =
                colonnes.type?.[0];


            const colonneLieu =
                colonnes.lieu?.[0];


            const colonneInformation =
                colonnes.information?.[0];


            /*
             * Le fichier fourni contient :
             *
             * colonne 3 :
             * accompagnée = oui/non
             *
             * colonne 5 :
             * accompagnée = DAVID ou vide
             *
             * C'est la DEUXIEME qui nous intéresse
             * pour calculer repetitions.accompagne.
             */
            const colonneAccompagnateur =
                colonnes.accompagnee?.[1];


            /*
             * =================================================
             * VERIFICATION DES COLONNES
             * =================================================
             */

            const colonnesManquantes = [];


            if (!colonneDate) {

                colonnesManquantes.push(
                    "date"
                );

            }


            if (!colonneType) {

                colonnesManquantes.push(
                    "type"
                );

            }


            if (!colonneLieu) {

                colonnesManquantes.push(
                    "lieu"
                );

            }


            if (!colonneInformation) {

                colonnesManquantes.push(
                    "information"
                );

            }


            if (
                !colonneAccompagnateur
            ) {

                colonnesManquantes.push(
                    "2ème colonne accompagnée"
                );

            }


            if (
                colonnesManquantes.length
            ) {

                setErreursLecture([

                    `Colonnes introuvables : ${colonnesManquantes.join(", ")}`

                ]);


                return;

            }


            /*
             * =================================================
             * LECTURE DES LIGNES
             * =================================================
             */

            const erreurs = [];


            const lignesNormalisees =
                [];


            for (

                let rowNumber = 2;

                rowNumber <=
                worksheet.actualRowCount;

                rowNumber++

            ) {

                const row =
                    worksheet.getRow(
                        rowNumber
                    );


                /*
                 * ---------------------------------------------
                 * TYPE
                 * ---------------------------------------------
                 */

                const typeBrut =
                    getCellText(

                        row.getCell(
                            colonneType
                        )

                    );


                /*
                 * =============================================
                 * REGLE IMPORT :
                 *
                 * TYPE VIDE
                 * =>
                 * ON NE PREND PAS LA LIGNE.
                 * =============================================
                 */

                if (!typeBrut) {

                    continue;

                }


                /*
                 * ---------------------------------------------
                 * DATE
                 * ---------------------------------------------
                 */

                const dateCell =
                    row.getCell(
                        colonneDate
                    );


                const dateValeur =
                    getCellValue(
                        dateCell
                    );


                const dateBrute =
                    getCellText(
                        dateCell
                    );


                const date =
                    normaliserDateExcel(
                        dateValeur
                    );


                /*
                 * ---------------------------------------------
                 * LIEU
                 * ---------------------------------------------
                 */

                const lieu =
                    getCellText(

                        row.getCell(
                            colonneLieu
                        )

                    );


                /*
                 * ---------------------------------------------
                 * ACCOMPAGNATEUR
                 * ---------------------------------------------
                 */

                const accompagnateur =
                    getCellText(

                        row.getCell(
                            colonneAccompagnateur
                        )

                    );


                /*
                 * REGLE :
                 *
                 * deuxième colonne accompagnée
                 * non vide
                 *
                 * =>
                 *
                 * accompagne = true
                 */
                const accompagne =
                    Boolean(
                        accompagnateur.trim()
                    );


                /*
                 * ---------------------------------------------
                 * INFORMATION
                 * ---------------------------------------------
                 */

                const information =
                    getCellText(

                        row.getCell(
                            colonneInformation
                        )

                    );


                /*
                 * ---------------------------------------------
                 * TYPE BDD
                 * ---------------------------------------------
                 */

                const typeCode =
                    convertirTypeVersCode(
                        typeBrut
                    );


                /*
                 * ---------------------------------------------
                 * LIEU PAR DEFAUT
                 * ---------------------------------------------
                 *
                 * "défaut"
                 * "defaut"
                 *
                 * donnent tous les deux :
                 *
                 * defaut
                 */

                const lieuDefaut =

                    normaliserTexte(
                        lieu
                    ) ===
                    "defaut";


                /*
                 * ---------------------------------------------
                 * VALIDATION
                 * ---------------------------------------------
                 */

                let valide = true;


                if (!date) {

                    valide = false;


                    erreurs.push(

                        `Ligne ${rowNumber} : date invalide "${dateBrute}".`

                    );

                }


                if (!typeCode) {

                    valide = false;


                    erreurs.push(

                        `Ligne ${rowNumber} : type de répétition inconnu "${typeBrut}".`

                    );

                }


                /*
                 * ---------------------------------------------
                 * OBJET FINAL
                 * ---------------------------------------------
                 */

                lignesNormalisees.push({

                    ligneExcel:
                        rowNumber,

                    date,

                    dateBrute,

                    typeBrut,

                    typeCode,

                    accompagne,

                    accompagnateur:
                        accompagnateur ||
                        null,

                    lieu:
                        lieu ||
                        null,

                    lieuDefaut,

                    information:
                        information ||
                        null,

                    valide

                });

            }


            console.log(
                "Lignes répétitions :",
                lignesNormalisees
            );


            setLignes(
                lignesNormalisees
            );


            setErreursLecture(
                erreurs
            );


        } catch (error) {

            console.error(

                "Erreur lecture Excel répétitions :",

                error

            );


            setErreursLecture([

                "Impossible de lire le fichier Excel."

            ]);

        }

    };


    /*
     * =========================================================
     * IMPORT
     * =========================================================
     */

    const handleImport = async () => {

        if (!saisonId) {

            setResultat({

                success: false,

                message:
                    "Aucune saison sélectionnée."

            });


            return;

        }


        /*
         * Les lignes sans type ont déjà été
         * éliminées lors de la lecture.
         */

        const lignesValides =
            lignes.filter(

                ligne =>
                    ligne.valide

            );


        if (!lignesValides.length) {

            setResultat({

                success: false,

                message:
                    "Aucune répétition valide à importer."

            });


            return;

        }


        /*
         * =====================================================
         * OBJET ENVOYE AU RPC
         * =====================================================
         */

        const repetitionsAImporter =
            lignesValides.map(

                ligne => ({

                    ligneExcel:
                        ligne.ligneExcel,


                    /*
                     * Date de la REPETITION.
                     *
                     * Exemple :
                     *
                     * 2027-06-22T00:00:00+00:00
                     */
                    date:
                        `${ligne.date}T00:00:00+00:00`,


                    type_code:
                        ligne.typeCode,


                    accompagne:
                        ligne.accompagne,


                    description:
                        ligne.information,


                    lieu_defaut:
                        ligne.lieuDefaut,


                    lieu:
                        ligne.lieu

                })

            );


        console.log(

            "Répétitions à importer :",

            repetitionsAImporter

        );


        setLoading(true);

        setResultat(null);


        try {

            /*
             * -------------------------------------------------
             * APPEL RPC
             * -------------------------------------------------
             */

            const {
                data,
                error
            } =
                await supabase.rpc(

                    "import_repetitions_saison",

                    {

                        p_saison_id:
                            saisonId,

                        p_repetitions:
                            repetitionsAImporter

                    }

                );


            if (error) {

                console.error(

                    "Erreur import répétitions :",

                    error

                );


                setResultat({

                    success: false,

                    message:
                        error.message

                });


                return;

            }


            console.log(

                "Résultat import répétitions :",

                data

            );


            setResultat({

                success: true,

                data

            });


            /*
             * Rechargement éventuel du CRUD.
             */

            if (

                data?.repetitions_creees >
                0 &&

                typeof onImported ===
                "function"

            ) {

                onImported();

            }


        } catch (error) {

            console.error(

                "Erreur import répétitions :",

                error

            );


            setResultat({

                success: false,

                message:
                    error.message ||
                    "Une erreur est survenue."

            });


        } finally {

            setLoading(false);

        }

    };


    /*
     * =========================================================
     * RESET
     * =========================================================
     */

    const reset = () => {

        setFichier(null);

        setLignes([]);

        setErreursLecture([]);

        setResultat(null);


        if (
            fileInputRef.current
        ) {

            fileInputRef.current.value =
                "";

        }

    };


    /*
     * =========================================================
     * RENDU
     * =========================================================
     */

    return (

        <div

            style={{

                marginTop:
                    "30px",

                padding:
                    "20px",

                border:
                    "1px solid #ddd",

                borderRadius:
                    "8px",

                background:
                    "#fff"

            }}

        >

            <h2>

                Importer les répétitions dans la saison SELECTIONNEE :{" "}

                {
                    saisonSelectionne
                        ?.nom
                }


                {
                    saisonActive?.id ===
                    saisonId && (

                        <label
                            className="icon-saisonactive"
                        ></label>

                    )
                }

            </h2>


            <p>

                Colonnes attendues :

            </p>


            <ul>

                <li>
                    date
                </li>

                <li>
                    type
                </li>

                <li>
                    accompagnée
                    {" "}
                    (oui/non)
                </li>

                <li>
                    lieu
                </li>

                <li>
                    accompagnée
                    {" "}
                    (nom accompagnateur)
                </li>

                <li>
                    information
                </li>

            </ul>


            <p>

                Les lignes sans type sont
                automatiquement ignorées.

            </p>


            <p>

                Types reconnus :

                {" "}

                <strong>
                    par groupe
                </strong>

                {" => "}

                <strong>
                    pgroupe
                </strong>

                {" / "}

                <strong>
                    ensemble
                </strong>

                {" => "}

                <strong>
                    complet
                </strong>

            </p>


            {/* ================================================
                SELECTION FICHIER
                ================================================ */}

            <div
                style={{
                    marginTop:
                        "20px",

                    marginBottom:
                        "20px"
                }}
            >

                <input

                    ref={
                        fileInputRef
                    }

                    type="file"

                    accept=".xlsx"

                    onChange={
                        handleFileChange
                    }

                />

            </div>


            {/* ================================================
                NOM FICHIER
                ================================================ */}

            {fichier && (

                <div

                    style={{

                        marginBottom:
                            "20px",

                        padding:
                            "10px",

                        background:
                            "#f5f5f5"

                    }}

                >

                    <strong>
                        Fichier :
                    </strong>

                    {" "}

                    {fichier.name}

                </div>

            )}


            {/* ================================================
                ERREURS LECTURE
                ================================================ */}

            {
                erreursLecture.length >
                0 && (

                    <div

                        style={{

                            marginBottom:
                                "20px",

                            padding:
                                "12px",

                            background:
                                "#fff3f3",

                            border:
                                "1px solid #ffcccc",

                            borderRadius:
                                "5px"

                        }}

                    >

                        <strong>
                            Erreurs détectées :
                        </strong>


                        <ul>

                            {
                                erreursLecture.map(

                                    (
                                        erreur,
                                        index
                                    ) => (

                                        <li
                                            key={
                                                index
                                            }
                                        >

                                            {
                                                erreur
                                            }

                                        </li>

                                    )

                                )
                            }

                        </ul>

                    </div>

                )
            }


            {/* ================================================
                APERCU
                ================================================ */}

            {
                lignes.length >
                0 && (

                    <div

                        style={{

                            marginBottom:
                                "20px"

                        }}

                    >

                        <h3>

                            Aperçu (
                            {
                                lignes.length
                            }
                            {" "}
                            répétitions)

                        </h3>


                        <div

                            style={{

                                overflowX:
                                    "auto",

                                maxHeight:
                                    "500px",

                                overflowY:
                                    "auto"

                            }}

                        >

                            <table

                                style={{

                                    width:
                                        "100%",

                                    borderCollapse:
                                        "collapse"

                                }}

                            >

                                <thead>

                                    <tr>

                                        <th style={thStyle}>
                                            Ligne
                                        </th>

                                        <th style={thStyle}>
                                            Date
                                        </th>

                                        <th style={thStyle}>
                                            Type Excel
                                        </th>

                                        <th style={thStyle}>
                                            Type BDD
                                        </th>

                                        <th style={thStyle}>
                                            Accompagnateur
                                        </th>

                                        <th style={thStyle}>
                                            Accompagné
                                        </th>

                                        <th style={thStyle}>
                                            Lieu
                                        </th>

                                        <th style={thStyle}>
                                            Rendez-vous
                                        </th>

                                        <th style={thStyle}>
                                            Information
                                        </th>

                                        <th style={thStyle}>
                                            Etat
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {
                                        lignes.map(

                                            (
                                                ligne,
                                                index
                                            ) => (

                                                <tr
                                                    key={
                                                        index
                                                    }
                                                >

                                                    <td style={tdStyle}>
                                                        {
                                                            ligne.ligneExcel
                                                        }
                                                    </td>


                                                    <td style={tdStyle}>
                                                        {
                                                            ligne.date ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td style={tdStyle}>
                                                        {
                                                            ligne.typeBrut ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td style={tdStyle}>
                                                        {
                                                            ligne.typeCode ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td style={tdStyle}>
                                                        {
                                                            ligne.accompagnateur ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td style={tdStyle}>

                                                        {
                                                            ligne.accompagne

                                                                ? "Oui"

                                                                : "Non"
                                                        }

                                                    </td>


                                                    <td style={tdStyle}>
                                                        {
                                                            ligne.lieu ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td style={tdStyle}>

                                                        {
                                                            ligne.lieuDefaut

                                                                ? "Défaut"

                                                                : "Nouveau"
                                                        }

                                                    </td>


                                                    <td style={tdStyle}>
                                                        {
                                                            ligne.information ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td style={tdStyle}>

                                                        {
                                                            ligne.valide

                                                                ? "OK"

                                                                : "Erreur"
                                                        }

                                                    </td>

                                                </tr>

                                            )

                                        )
                                    }

                                </tbody>

                            </table>

                        </div>

                    </div>

                )
            }


            {/* ================================================
                BOUTONS
                ================================================ */}

            <div

                style={{

                    display:
                        "flex",

                    gap:
                        "10px"

                }}

            >

                <button

                    type="button"

                    onClick={
                        handleImport
                    }

                    disabled={

                        loading ||

                        !lignes.some(
                            ligne =>
                                ligne.valide
                        ) ||

                        !saisonId

                    }

                >

                    {
                        loading

                            ? "Import en cours..."

                            : "Importer les répétitions"
                    }

                </button>


                <button

                    type="button"

                    onClick={
                        reset
                    }

                    disabled={
                        loading
                    }

                >

                    Annuler

                </button>

            </div>


            {/* ================================================
                RESULTAT
                ================================================ */}

            {resultat && (

                <div

                    style={{

                        marginTop:
                            "20px",

                        padding:
                            "15px",

                        borderRadius:
                            "5px",

                        background:
                            resultat.success

                                ? "#f0fff4"

                                : "#fff3f3",

                        border:
                            resultat.success

                                ? "1px solid #b7ebc6"

                                : "1px solid #ffcccc"

                    }}

                >

                    {
                        !resultat.success
                            ? (

                                <strong>

                                    ❌ {
                                        resultat.message
                                    }

                                </strong>

                            ) : (

                                <>

                                    <h3>
                                        ✅ Import terminé
                                    </h3>


                                    <p>

                                        Répétitions créées :{" "}

                                        <strong>

                                            {
                                                resultat.data
                                                    ?.repetitions_creees
                                            }

                                        </strong>

                                    </p>

                                    <p>

                                        Répétitions mises à jour :{" "}

                                        <strong>
                                            {
                                                resultat.data
                                                    ?.repetitions_mises_a_jour
                                            }
                                        </strong>

                                    </p>
                                    <p>

                                        Rendez-vous spécifiques créés :{" "}

                                        <strong>

                                            {
                                                resultat.data
                                                    ?.rendezvous_crees
                                            }

                                        </strong>

                                    </p>


                                    {
                                        resultat.data
                                            ?.erreurs
                                            ?.length >
                                        0 && (

                                            <div>

                                                <strong>
                                                    ⚠️ Erreurs :
                                                </strong>


                                                <ul>

                                                    {
                                                        resultat.data
                                                            .erreurs
                                                            .map(

                                                                (
                                                                    erreur,
                                                                    index
                                                                ) => (

                                                                    <li
                                                                        key={
                                                                            index
                                                                        }
                                                                    >

                                                                        Ligne{" "}

                                                                        {
                                                                            erreur.ligneExcel ??
                                                                            "?"
                                                                        }

                                                                        {" : "}

                                                                        {
                                                                            erreur.message
                                                                        }

                                                                    </li>

                                                                )

                                                            )
                                                    }

                                                </ul>

                                            </div>

                                        )
                                    }

                                </>

                            )
                    }

                </div>

            )}

        </div>

    );

}


/*
 * =============================================================
 * CONVERSION TYPE EXCEL => CODE BDD
 * =============================================================
 */

function convertirTypeVersCode(
    value
) {

    const type =
        normaliserTexte(
            value
        );


    if (
        type === "par groupe" ||
        type === "pgroupe"
    ) {

        return "pgroupe";

    }


    if (
        type === "ensemble" ||
        type === "complet"
    ) {

        return "complet";

    }


    return null;

}


/*
 * =============================================================
 * NORMALISATION TEXTE
 * =============================================================
 */

function normaliserTexte(
    value
) {

    return String(
        value || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toLowerCase();

}


/*
 * =============================================================
 * RECUPERATION VALEUR CELLULE EXCELJS
 * =============================================================
 */

function getCellValue(
    cell
) {

    const value =
        cell?.value;


    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    /*
     * Vraie date Excel.
     */

    if (
        value instanceof Date
    ) {

        return value;

    }


    /*
     * Valeurs ExcelJS complexes.
     */

    if (
        typeof value ===
        "object"
    ) {

        /*
         * Formule.
         */

        if (

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "result"
                ) &&

            value.result !==
            null &&

            value.result !==
            undefined

        ) {

            return value.result;

        }


        /*
         * Texte enrichi.
         */

        if (
            Array.isArray(
                value.richText
            )
        ) {

            return value.richText
                .map(
                    part =>
                        part.text ??
                        ""
                )
                .join("");

        }


        /*
         * Hyperlien / texte.
         */

        if (

            Object.prototype
                .hasOwnProperty.call(
                    value,
                    "text"
                )

        ) {

            return value.text ??
                "";

        }

    }


    return value;

}


/*
 * =============================================================
 * RECUPERATION TEXTE CELLULE
 * =============================================================
 */

function getCellText(
    cell
) {

    /*
     * ExcelJS donne directement
     * le texte affiché.
     */

    if (

        typeof cell?.text ===
        "string" &&

        cell.text.trim() !==
        ""

    ) {

        return cell.text.trim();

    }


    const value =
        getCellValue(
            cell
        );


    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return "";

    }


    /*
     * Pour une date,
     * on la retourne déjà
     * au format ISO.
     */

    if (
        value instanceof Date
    ) {

        return formatDateISO(
            value
        );

    }


    return String(
        value
    ).trim();

}


/*
 * =============================================================
 * DATE EXCEL
 * =============================================================
 */

function normaliserDateExcel(
    value
) {

    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return null;

    }


    /*
     * ExcelJS transforme normalement
     * les dates Excel en Date JavaScript.
     */

    if (
        value instanceof Date
    ) {

        if (
            Number.isNaN(
                value.getTime()
            )
        ) {

            return null;

        }


        return formatDateISO(
            value
        );

    }


    /*
     * Numéro de série Excel.
     */

    if (

        typeof value ===
        "number" &&

        Number.isFinite(
            value
        )

    ) {

        const date =
            excelSerialToDate(
                value
            );


        return date

            ? formatDateISO(
                date
            )

            : null;

    }


    const texte =
        String(
            value
        ).trim();


    if (!texte) {

        return null;

    }


    /*
     * YYYY-MM-DD
     */

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            texte
        )
    ) {

        return texte;

    }


    /*
     * DD/MM/YYYY
     * DD-MM-YYYY
     * DD.MM.YYYY
     */

    const matchFrancais =
        texte.match(

            /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/

        );


    if (matchFrancais) {

        const [
            ,
            jour,
            mois,
            annee
        ] =
            matchFrancais;


        return (
            `${annee}-${mois.padStart(
                2,
                "0"
            )}-${jour.padStart(
                2,
                "0"
            )}`
        );

    }


    /*
     * Dernière tentative.
     */

    const date =
        new Date(
            texte
        );


    if (
        !Number.isNaN(
            date.getTime()
        )
    ) {

        return formatDateISO(
            date
        );

    }


    return null;

}


/*
 * =============================================================
 * NUMERO DE SERIE EXCEL => DATE
 * =============================================================
 */

function excelSerialToDate(
    serial
) {

    if (

        !Number.isFinite(
            serial
        ) ||

        serial <= 0

    ) {

        return null;

    }


    const wholeDays =
        Math.floor(
            serial
        );


    const epoch =
        wholeDays < 60

            ? Date.UTC(
                1899,
                11,
                31
            )

            : Date.UTC(
                1899,
                11,
                30
            );


    const milliseconds =

        epoch +

        wholeDays *

        24 *

        60 *

        60 *

        1000;


    return new Date(
        milliseconds
    );

}


/*
 * =============================================================
 * DATE => YYYY-MM-DD
 * =============================================================
 */

function formatDateISO(
    date
) {

    return (

        `${date.getUTCFullYear()}-${String(

            date.getUTCMonth() +
            1

        ).padStart(

            2,
            "0"

        )}-${String(

            date.getUTCDate()

        ).padStart(

            2,
            "0"

        )}`

    );

}


/*
 * =============================================================
 * STYLES TABLE
 * =============================================================
 */

const thStyle = {

    border:
        "1px solid #ddd",

    padding:
        "8px",

    background:
        "#f5f5f5",

    textAlign:
        "left"

};


const tdStyle = {

    border:
        "1px solid #ddd",

    padding:
        "8px"

};