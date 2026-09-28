import { useRef, useState } from "react";

import ExcelJS from "exceljs/dist/exceljs.min.js";

import { supabase } from "../core/supabase/client";

import { useSaison } from "./contexts/SaisonContext";


export default function ImportChanteursExcel({ saisonId }) {

    const fileInputRef = useRef(null);

    const {
        saisonSelectionne,
        saisonActive
    } = useSaison();

    const [fichier, setFichier] = useState(null);

    const [lignes, setLignes] = useState([]);

    const [erreursLecture, setErreursLecture] = useState([]);

    const [loading, setLoading] = useState(false);

    const [resultat, setResultat] = useState(null);



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
    const handleFileChange = async (event) => {

        const file = event.target.files?.[0];

        setFichier(null);
        setLignes([]);
        setErreursLecture([]);
        setResultat(null);

        if (!file) {
            return;
        }

        const extension = file.name
            .split(".")
            .pop()
            .toLowerCase();

        if (extension !== "xlsx") {

            setErreursLecture([
                "Le fichier doit être un fichier Excel au format .xlsx.",
            ]);

            return;
        }

        setFichier(file);

        try {

            const buffer = await file.arrayBuffer();

            const workbook = new ExcelJS.Workbook();

            await workbook.xlsx.load(buffer);

            if (!workbook.worksheets.length) {

                setErreursLecture([
                    "Le fichier Excel ne contient aucune feuille.",
                ]);

                return;
            }

            const worksheet = workbook.worksheets[0];

            if (worksheet.actualRowCount === 0) {

                setErreursLecture([
                    "La feuille Excel ne contient aucune donnée.",
                ]);

                return;
            }


            /*
             * =====================================================
             * RECHERCHE DES COLONNES PAR LEUR EN-TÊTE
             * =====================================================
             */

            const headerRow = worksheet.getRow(1);

            const colonnes = {};


            headerRow.eachCell(
                { includeEmpty: false },
                (cell, columnNumber) => {

                    const nomColonne =
                        normaliserEntete(
                            getCellText(cell)
                        );

                    if (nomColonne) {

                        colonnes[nomColonne] =
                            columnNumber;

                    }
                }
            );


            console.log(
                "Colonnes Excel détectées :",
                colonnes
            );


            /*
             * Colonnes qui nous intéressent réellement.
             *
             */
            const colonneNom =
                colonnes[
                normaliserEntete(
                    "Nom adhérent"
                )
                ];

            const colonnePrenom =
                colonnes[
                normaliserEntete(
                    "Prénom adhérent"
                )
                ];

            const colonneRue =
                colonnes[
                normaliserEntete(
                    "Adresse Postale"
                )
                ];

            const colonneCodePostal =
                colonnes[
                normaliserEntete(
                    "Code postal"
                )
                ];

            const colonneVille =
                colonnes[
                normaliserEntete(
                    "Ville"
                )
                ];

            const colonneTelephone =
                colonnes[
                normaliserEntete(
                    "Numéro de téléphone"
                )
                ];

            const colonneEmail =
                colonnes[
                normaliserEntete(
                    "Adresse mail"
                )
                ];

            const colonneDateNaissance =
                colonnes[
                normaliserEntete(
                    "Date naissance"
                )
                ];

            const colonneGroupe =
                colonnes[
                normaliserEntete(
                    "Groupe de répét"
                )
                ];


            /*
             * =====================================================
             * VÉRIFICATION DES COLONNES OBLIGATOIRES
             * =====================================================
             */

            const colonnesManquantes = [];

            if (!colonneNom) {
                colonnesManquantes.push(
                    "Nom adhérent"
                );
            }

            if (!colonnePrenom) {
                colonnesManquantes.push(
                    "Prénom adhérent"
                );
            }

            if (!colonneRue) {
                colonnesManquantes.push(
                    "Adresse Postale"
                );
            }

            if (!colonneCodePostal) {
                colonnesManquantes.push(
                    "Code postal"
                );
            }

            if (!colonneVille) {
                colonnesManquantes.push(
                    "Ville"
                );
            }

            if (!colonneTelephone) {
                colonnesManquantes.push(
                    "Numéro de téléphone"
                );
            }

            if (!colonneEmail) {
                colonnesManquantes.push(
                    "Adresse mail"
                );
            }

            if (!colonneDateNaissance) {
                colonnesManquantes.push(
                    "Date naissance"
                );
            }

            if (!colonneGroupe) {
                colonnesManquantes.push(
                    "Groupe de répét"
                );
            }


            if (colonnesManquantes.length) {

                setErreursLecture([
                    `Colonnes introuvables : ${colonnesManquantes.join(", ")}`
                ]);

                return;
            }


            /*
             * =====================================================
             * LECTURE DES LIGNES
             * =====================================================
             */

            const erreurs = [];

            const lignesNormalisees = [];


            for (
                let rowNumber = 2;
                rowNumber <= worksheet.actualRowCount;
                rowNumber++
            ) {

                const row =
                    worksheet.getRow(rowNumber);


                /*
                 * -------------------------------------------------
                 * LECTURE
                 * -------------------------------------------------
                 */

                const nom =
                    getCellText(
                        row.getCell(
                            colonneNom
                        )
                    );


                const prenom =
                    getCellText(
                        row.getCell(
                            colonnePrenom
                        )
                    );


                const rue =
                    getCellText(
                        row.getCell(
                            colonneRue
                        )
                    );


                const code_postal =
                    getCellText(
                        row.getCell(
                            colonneCodePostal
                        )
                    );


                const ville =
                    getCellText(
                        row.getCell(
                            colonneVille
                        )
                    );


                const telephone =
                    getCellText(
                        row.getCell(
                            colonneTelephone
                        )
                    );


                const email =
                    getCellText(
                        row.getCell(
                            colonneEmail
                        )
                    );


                const dateCell =
                    row.getCell(
                        colonneDateNaissance
                    );


                const dateNaissanceValeur =
                    getCellValue(
                        dateCell
                    );


                const dateNaissanceBrute =
                    getCellText(
                        dateCell
                    );


                const date_naissance =
                    normaliserDateExcel(
                        dateNaissanceValeur
                    );


                const groupe_repetition =
                    getCellText(
                        row.getCell(
                            colonneGroupe
                        )
                    );


                /*
                 * -------------------------------------------------
                 * IGNORER UNE LIGNE RÉELLEMENT VIDE
                 * -------------------------------------------------
                 */

                const ligneVide =
                    !nom &&
                    !prenom &&
                    !rue &&
                    !code_postal &&
                    !ville &&
                    !telephone &&
                    !email &&
                    !dateNaissanceBrute &&
                    !groupe_repetition;


                if (ligneVide) {

                    continue;
                }


                /*
                 * -------------------------------------------------
                 * DEBUG
                 * -------------------------------------------------
                 */

                console.log(
                    `Ligne Excel ${rowNumber}`,
                    {
                        nom,
                        prenom,
                        rue,
                        code_postal,
                        ville,
                        telephone,
                        email,
                        dateNaissanceBrute,
                        groupe_repetition
                    }
                );


                /*
                 * -------------------------------------------------
                 * VALIDATION DATE
                 * -------------------------------------------------
                 */

                if (
                    dateNaissanceBrute &&
                    !date_naissance
                ) {

                    erreurs.push(
                        `Ligne ${rowNumber} : date de naissance invalide "${dateNaissanceBrute}".`
                    );

                }


                /*
                 * -------------------------------------------------
                 * VALIDATION NOM / PRÉNOM
                 * -------------------------------------------------
                 */

                if (!nom) {

                    erreurs.push(
                        `Ligne ${rowNumber} : nom manquant.`
                    );

                }


                if (!prenom) {

                    erreurs.push(
                        `Ligne ${rowNumber} : prénom manquant.`
                    );

                }


                /*
                 * -------------------------------------------------
                 * OBJET FINAL
                 * -------------------------------------------------
                 */

                lignesNormalisees.push({

                    ligneExcel:
                        rowNumber,

                    nom,

                    prenom,

                    rue:
                        rue || null,

                    code_postal:
                        code_postal || null,

                    ville:
                        ville || null,

                    telephone:
                        telephone || null,

                    email:
                        email || null,

                    date_naissance,

                    groupe_repetition:
                        groupe_repetition || null,

                });

            }


            setLignes(
                lignesNormalisees
            );

            setErreursLecture(
                erreurs
            );


        } catch (error) {

            console.error(
                "Erreur lecture Excel :",
                error
            );

            setErreursLecture([
                "Impossible de lire le fichier Excel.",
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
                message: "Aucune saison sélectionnée.",
            });

            return;

        }


        if (!lignes.length) {

            setResultat({
                success: false,
                message: "Aucune ligne à importer.",
            });

            return;

        }


        /*
         * On n'envoie pas les lignes avec
         * nom/prénom manquants.
         */
        const lignesValides =
            lignes.filter(
                (ligne) =>
                    ligne.nom &&
                    ligne.prenom
            );


        if (!lignesValides.length) {

            setResultat({
                success: false,
                message: "Aucune ligne valide à importer.",
            });

            return;

        }


        setLoading(true);

        setResultat(null);


        try {

            /*
             * ---------------------------------------------------------
             * RÉCUPÉRATION DES GROUPES DE LA SAISON
             * ---------------------------------------------------------
             *
             * On charge les groupes UNE SEULE FOIS pour tout le
             * fichier Excel.
             * ---------------------------------------------------------
             */
            const {
                data: groupes,
                error: groupesError
            } = await supabase
                .from("groupes")
                .select("id, nom")
                .eq(
                    "saison_id",
                    saisonId
                )
                .is(
                    "deleted_at",
                    null
                );


            if (groupesError) {

                console.error(
                    "Erreur récupération groupes :",
                    groupesError
                );

                throw groupesError;

            }


            /*
             * ---------------------------------------------------------
             * GROUPE 1
             * ---------------------------------------------------------
             */
            const groupe1 =
                groupes?.find(
                    groupe =>
                        normaliserTexte(
                            groupe.nom
                        ) === "groupe 1"
                );


            /*
             * ---------------------------------------------------------
             * GROUPE 2
             * ---------------------------------------------------------
             */
            const groupe2 =
                groupes?.find(
                    groupe =>
                        normaliserTexte(
                            groupe.nom
                        ) === "groupe 2"
                );


            if (!groupe1) {

                throw new Error(
                    `Le groupe "groupe 1" n'existe pas pour la saison sélectionnée.`
                );

            }


            if (!groupe2) {

                throw new Error(
                    `Le groupe "groupe 2" n'existe pas pour la saison sélectionnée.`
                );

            }


            /*
             * ---------------------------------------------------------
             * TRANSFORMATION DES LIGNES AVANT IMPORT
             * ---------------------------------------------------------
             *
             * RÈGLE EN DUR :
             *
             * Groupe de répét = "21h30"
             *      => groupe 2
             *
             * sinon
             *      => groupe 1
             *
             * ---------------------------------------------------------
             */
            const chanteursAImporter =
                lignesValides.map(
                    ligne => {

                        const groupeId =
                            normaliserTexte(
                                ligne.groupe_repetition
                            ) === "21h30"

                                ? groupe2.id

                                : groupe1.id;


                        /*
                         * On construit volontairement l'objet
                         * envoyé au RPC.
                         *
                         * et groupe_repetition
                         * ne sont pas envoyés.
                         */
                        return {

                            ligneExcel:
                                ligne.ligneExcel,

                            nom:
                                ligne.nom,

                            prenom:
                                ligne.prenom,

                            email:
                                ligne.email,

                            telephone:
                                ligne.telephone,

                            rue:
                                ligne.rue,

                            code_postal:
                                ligne.code_postal,

                            ville:
                                ligne.ville,

                            date_naissance:
                                ligne.date_naissance,

                            groupe_id:
                                groupeId,

                        };

                    }
                );


            console.log(
                "Groupes de la saison :",
                {
                    groupe1,
                    groupe2
                }
            );


            console.log(
                "Chanteurs à importer :",
                chanteursAImporter
            );


            /*
             * ---------------------------------------------------------
             * APPEL RPC
             * ---------------------------------------------------------
             */
            const {
                data,
                error
            } = await supabase.rpc(

                "import_chanteurs_saison",

                {

                    p_saison_id:
                        saisonId,

                    p_chanteurs:
                        chanteursAImporter,

                }

            );


            if (error) {

                console.error(
                    "Erreur import chanteurs :",
                    error
                );


                setResultat({

                    success: false,

                    message:
                        error.message,

                });


                return;

            }


            console.log(
                "Résultat import chanteurs :",
                data
            );


            setResultat({

                success: true,

                data,

            });


        } catch (error) {

            console.error(
                "Erreur import chanteurs :",
                error
            );


            setResultat({

                success: false,

                message:
                    error.message ||
                    "Une erreur est survenue.",

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


        if (fileInputRef.current) {

            fileInputRef.current.value = "";

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

                padding: "20px",

                border:
                    "1px solid #ddd",

                borderRadius:
                    "8px",

                background:
                    "#fff",

            }}

        >

            <h2>

                Importer des chanteurs dans la saison SELECTIONNEE :{" "}

                {saisonSelectionne?.nom}


                {saisonActive?.id === saisonId && (

                    <label
                        className="icon-saisonactive"
                    ></label>

                )}

            </h2>


            <p>

                Importez un fichier Excel contenant les colonnes :

            </p>


            <ul>

                <li>
                    Nom adhérent
                </li>

                <li>
                    Prénom adhérent
                </li>

                <li>
                    Adresse Postale
                </li>

                <li>
                    Code postal
                </li>

                <li>
                    Ville
                </li>

                <li>
                    Numéro de téléphone
                </li>

                <li>
                    Adresse mail
                </li>

                <li>
                    Date naissance
                </li>

                <li>
                    Groupe de répét
                </li>

            </ul>


            {/* Sélection du fichier */}

            <div
                style={{
                    marginBottom: "20px"
                }}
            >

                <input

                    ref={fileInputRef}

                    type="file"

                    accept=".xlsx"

                    onChange={
                        handleFileChange
                    }

                />

            </div>


            {/* Nom du fichier */}

            {fichier && (

                <div

                    style={{

                        marginBottom:
                            "20px",

                        padding:
                            "10px",

                        background:
                            "#f5f5f5",

                    }}

                >

                    <strong>
                        Fichier :
                    </strong>{" "}

                    {fichier.name}

                </div>

            )}


            {/* Erreurs de lecture */}

            {erreursLecture.length > 0 && (

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
                            "5px",

                    }}

                >

                    <strong>
                        Erreurs détectées :
                    </strong>


                    <ul>

                        {erreursLecture.map(
                            (
                                erreur,
                                index
                            ) => (

                                <li
                                    key={index}
                                >

                                    {erreur}

                                </li>

                            )
                        )}

                    </ul>

                </div>

            )}


            {/* Aperçu */}

            {lignes.length > 0 && (

                <div
                    style={{
                        marginBottom:
                            "20px"
                    }}
                >

                    <h3>

                        Aperçu ({lignes.length} lignes)

                    </h3>


                    <div

                        style={{

                            overflowX:
                                "auto",

                            maxHeight:
                                "400px",

                            overflowY:
                                "auto",

                        }}

                    >

                        <table

                            style={{

                                width:
                                    "100%",

                                borderCollapse:
                                    "collapse",

                            }}

                        >

                            <thead>

                                <tr>

                                    <th style={thStyle}>
                                        Ligne
                                    </th>

                                    <th style={thStyle}>
                                        Nom
                                    </th>

                                    <th style={thStyle}>
                                        Prénom
                                    </th>

                                    <th style={thStyle}>
                                        Adresse
                                    </th>

                                    <th style={thStyle}>
                                        Code postal
                                    </th>

                                    <th style={thStyle}>
                                        Ville
                                    </th>

                                    <th style={thStyle}>
                                        Téléphone
                                    </th>

                                    <th style={thStyle}>
                                        Email
                                    </th>

                                    <th style={thStyle}>
                                        Date de naissance
                                    </th>

                                    <th style={thStyle}>
                                        Groupe de répét
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {lignes.map(
                                    (
                                        ligne,
                                        index
                                    ) => (

                                        <tr key={index}>

                                            <td style={tdStyle}>

                                                {
                                                    ligne.ligneExcel
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.nom ||
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.prenom ||
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.rue ||
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.code_postal ??
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.ville ||
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.telephone ||
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.email ||
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.date_naissance ||
                                                    "-"
                                                }

                                            </td>


                                            <td style={tdStyle}>

                                                {
                                                    ligne.groupe_repetition ||
                                                    "-"
                                                }

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            )}


            {/* Boutons */}

            <div

                style={{

                    display:
                        "flex",

                    gap:
                        "10px",

                }}

            >

                <button

                    type="button"

                    onClick={
                        handleImport
                    }

                    disabled={

                        loading ||

                        !lignes.length ||

                        !saisonId

                    }

                >

                    {
                        loading

                            ? "Import en cours..."

                            : "Importer les chanteurs"
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


            {/* Résultat */}

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

                                : "1px solid #ffcccc",

                    }}

                >

                    {!resultat.success ? (

                        <strong>

                            ❌ {resultat.message}

                        </strong>

                    ) : (

                        <>

                            <h3>

                                ✅ Import terminé

                            </h3>


                            <p>

                                Chanteurs créés :{" "}

                                <strong>

                                    {
                                        resultat.data
                                            ?.chanteurs_crees
                                    }

                                </strong>

                            </p>


                            <p>

                                Chanteurs déjà existants :{" "}

                                <strong>

                                    {
                                        resultat.data
                                            ?.chanteurs_existants
                                    }

                                </strong>

                            </p>


                            <p>

                                Associations créées :{" "}

                                <strong>

                                    {
                                        resultat.data
                                            ?.associations_creees
                                    }

                                </strong>

                            </p>


                            <p>

                                Associations déjà existantes :{" "}

                                <strong>

                                    {
                                        resultat.data
                                            ?.associations_existantes
                                    }

                                </strong>

                            </p>


                            {
                                resultat.data
                                    ?.erreurs
                                    ?.length > 0 && (

                                    <div>

                                        <strong>
                                            ⚠️ Erreurs :
                                        </strong>


                                        <ul>

                                            {
                                                resultat.data.erreurs.map(
                                                    (
                                                        erreur,
                                                        index
                                                    ) => (

                                                        <li
                                                            key={index}
                                                        >

                                                            {
                                                                JSON.stringify(
                                                                    erreur
                                                                )
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

                    )}

                </div>

            )}

        </div>

    );

}


/*
 * =========================================================
 * NORMALISATION TEXTE
 * =========================================================
 *
 * Utilisé notamment pour comparer :
 *
 * "21h30"
 * "GROUPE 1"
 * "groupe 1"
 *
 */
function normaliserTexte(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}


/**
 * Récupère la valeur utile d'une cellule ExcelJS.
 *
 * Gère notamment :
 * - valeur simple
 * - date
 * - formule avec résultat
 * - texte enrichi
 * - lien hypertexte
 */
function getCellValue(cell) {

    const value =
        cell?.value;


    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    if (value instanceof Date) {

        return value;

    }


    if (typeof value === "object") {

        if (

            Object.prototype.hasOwnProperty.call(
                value,
                "result"
            ) &&

            value.result !== null &&

            value.result !== undefined

        ) {

            return value.result;

        }


        if (
            Array.isArray(
                value.richText
            )
        ) {

            return value.richText

                .map(
                    part =>
                        part.text ?? ""
                )

                .join("");

        }


        if (

            Object.prototype.hasOwnProperty.call(
                value,
                "text"
            )

        ) {

            return value.text ?? "";

        }

    }


    return value;

}


/**
 * Retourne une cellule sous forme de texte.
 *
 * Pour les nombres possédant un masque Excel composé
 * de zéros (ex. 00000 ou 00 00 00 00 00), on conserve
 * les zéros initiaux.
 *
 * C'est utile notamment pour :
 * - les codes postaux
 * - les numéros de téléphone
 */
function getCellText(cell) {

    /*
     * ExcelJS fournit directement le texte
     * affichable de la cellule.
     *
     * C'est la méthode la plus robuste pour
     * les chaînes provenant de certains XLSX.
     */
    if (
        typeof cell?.text === "string" &&
        cell.text.trim() !== ""
    ) {

        return cell.text.trim();

    }


    const value =
        getCellValue(cell);


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    if (value instanceof Date) {

        return formatDateISO(
            value
        );

    }


    if (
        typeof value === "number"
    ) {

        return formatNumberWithExcelMask(
            value,
            cell?.numFmt
        );

    }


    return String(value).trim();

}

/**
 * Conserve les zéros initiaux lorsqu'une cellule numérique
 * utilise un masque Excel du type :
 *
 * 00000
 * 00 00 00 00 00
 */
function formatNumberWithExcelMask(
    value,
    numFmt
) {

    const format =
        String(
            numFmt || ""
        )
            .split(";")[0]
            .trim();


    /*
     * Les formats "General", dates, décimaux,
     * devises, etc. ne sont pas traités
     * comme des masques de chiffres.
     */
    if (

        !format ||

        format.toLowerCase() ===
        "general"

    ) {

        return String(value);

    }


    /*
     * On ne traite ici que les formats constitués
     * de zéros et de séparateurs usuels.
     */
    if (
        !/^[0\s().+\-/]+$/.test(
            format
        )
    ) {

        return String(value);

    }


    const zeroCount =
        (
            format.match(/0/g) ||
            []
        ).length;


    if (zeroCount === 0) {

        return String(value);

    }


    const sign =
        value < 0
            ? "-"
            : "";


    const digits =
        String(
            Math.trunc(
                Math.abs(value)
            )
        ).padStart(
            zeroCount,
            "0"
        );


    let digitIndex = 0;

    let result = "";


    for (
        const character
        of format
    ) {

        if (
            character === "0"
        ) {

            result +=
                digits[digitIndex] ??
                "0";


            digitIndex += 1;

        } else {

            result +=
                character;

        }

    }


    return sign + result;

}


/**
 * Convertit une date provenant d'Excel
 * en YYYY-MM-DD pour PostgreSQL.
 */
function normaliserDateExcel(value) {

    if (

        value === null ||

        value === undefined ||

        value === ""

    ) {

        return null;

    }


    /*
     * ExcelJS convertit normalement
     * une vraie cellule de type date
     * en objet Date.
     */
    if (
        value instanceof Date
    ) {

        if (
            isNaN(
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
     * Une date Excel peut également
     * arriver sous forme de numéro de série.
     */
    if (

        typeof value === "number" &&

        Number.isFinite(value)

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
        String(value).trim();


    if (!texte) {

        return null;

    }


    /*
     * Déjà au format YYYY-MM-DD
     */
    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            texte
        )
    ) {

        return texte;

    }


    /*
     * Format français :
     *
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
        ] = matchFrancais;


        return `${annee}-${mois.padStart(
            2,
            "0"
        )}-${jour.padStart(
            2,
            "0"
        )}`;

    }


    /*
     * Dernière tentative :
     * conversion JavaScript.
     */
    const date =
        new Date(texte);


    if (
        !isNaN(
            date.getTime()
        )
    ) {

        return formatDateISO(
            date
        );

    }


    return null;

}


/**
 * Convertit un numéro de série Excel en Date.
 *
 * Excel utilise le système de dates 1900
 * et contient historiquement le faux 29/02/1900.
 */
function excelSerialToDate(serial) {

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


/**
 * Formate une Date en YYYY-MM-DD
 * sans dépendre du fuseau horaire local.
 */
function formatDateISO(date) {

    return `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
    ).padStart(
        2,
        "0"
    )}-${String(
        date.getUTCDate()
    ).padStart(
        2,
        "0"
    )}`;

}


const thStyle = {

    border:
        "1px solid #ddd",

    padding:
        "8px",

    background:
        "#f5f5f5",

    textAlign:
        "left",

};


const tdStyle = {

    border:
        "1px solid #ddd",

    padding:
        "8px",

};