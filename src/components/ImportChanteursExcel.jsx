import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../core/supabase/client";

export default function ImportChanteursExcel({ saisonId }) {
    const fileInputRef = useRef(null);

    const [fichier, setFichier] = useState(null);
    const [lignes, setLignes] = useState([]);
    const [erreursLecture, setErreursLecture] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resultat, setResultat] = useState(null);

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];

        // Reset
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

        if (!["xlsx", "xls"].includes(extension)) {
            setErreursLecture([
                "Le fichier doit être un fichier Excel (.xlsx ou .xls).",
            ]);
            return;
        }

        setFichier(file);

        try {
            const buffer = await file.arrayBuffer();

            const workbook = XLSX.read(buffer, {
                type: "array",
                cellDates: true,
            });

            if (!workbook.SheetNames.length) {
                setErreursLecture([
                    "Le fichier Excel ne contient aucune feuille.",
                ]);
                return;
            }

            // Première feuille
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Conversion en tableau d'objets
            const data = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
                raw: false,
            });

            if (!data.length) {
                setErreursLecture([
                    "La feuille Excel ne contient aucune donnée.",
                ]);
                return;
            }

            const erreurs = [];

            const lignesNormalisees = data
                .slice(1)
                .map((row, index) => {
                    const ligneExcel = index + 2;

                    /*
                     * ---------------------------------------------------------
                     * COLONNES EXCEL
                     * ---------------------------------------------------------
                     *
                     * A = Prénom
                     * B = Nom
                     * C = Groupe
                     * D = Numéro de téléphone
                     * E = Email
                     * F = Adresse postale
                     * G = Code postal
                     * H = Ville
                     * I = Date de naissance
                     */

                    /*
                     * ---------------------------------------------------------
                     * PRÉNOM - colonne A
                     * ---------------------------------------------------------
                     */
                    const prenom = String(
                        row[0] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * NOM - colonne B
                     * ---------------------------------------------------------
                     */
                    const nom = String(
                        row[1] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * GROUPE - colonne C
                     * ---------------------------------------------------------
                     */
                    const groupe = String(
                        row[2] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * TÉLÉPHONE - colonne D
                     * ---------------------------------------------------------
                     */
                    const telephone = String(
                        row[3] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * EMAIL - colonne E
                     * ---------------------------------------------------------
                     */
                    const email = String(
                        row[4] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * ADRESSE POSTALE - colonne F
                     * ---------------------------------------------------------
                     */
                    const rue = String(
                        row[5] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * CODE POSTAL - colonne G
                     * ---------------------------------------------------------
                     *
                     * IMPORTANT :
                     * Le code postal doit rester une chaîne de caractères.
                     *
                     * Exemple :
                     *   01010 → "01010"
                     *   94120 → "94120"
                     *
                     * On ne fait surtout pas Number().
                     */
                    const code_postal = String(
                        row[6] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * VILLE - colonne H
                     * ---------------------------------------------------------
                     */
                    const ville = String(
                        row[7] ?? ""
                    ).trim();

                    /*
                     * ---------------------------------------------------------
                     * DATE DE NAISSANCE - colonne I
                     * ---------------------------------------------------------
                     */
                    const dateNaissanceBrute = String(
                        row[8] ?? ""
                    ).trim();

                    const date_naissance =
                        normaliserDateExcel(dateNaissanceBrute);

                    /*
                     * ---------------------------------------------------------
                     * VALIDATION DATE
                     * ---------------------------------------------------------
                     */
                    if (
                        dateNaissanceBrute &&
                        !date_naissance
                    ) {
                        erreurs.push(
                            `Ligne ${ligneExcel} : date de naissance invalide "${dateNaissanceBrute}".`
                        );
                    }

                    /*
                     * ---------------------------------------------------------
                     * VALIDATION NOM / PRÉNOM
                     * ---------------------------------------------------------
                     */
                    if (!nom) {
                        erreurs.push(
                            `Ligne ${ligneExcel} : nom manquant.`
                        );
                    }

                    if (!prenom) {
                        erreurs.push(
                            `Ligne ${ligneExcel} : prénom manquant.`
                        );
                    }

                    /*
                     * ---------------------------------------------------------
                     * OBJET FINAL
                     * ---------------------------------------------------------
                     */
                    return {
                        ligneExcel,

                        nom,
                        prenom,

                        groupe: groupe || null,

                        email: email || null,
                        telephone: telephone || null,

                        rue: rue || null,
                        code_postal: code_postal || null,
                        ville: ville || null,

                        date_naissance,
                    };
                });

            setLignes(lignesNormalisees);
            setErreursLecture(erreurs);
        } catch (error) {
            console.error("Erreur lecture Excel :", error);

            setErreursLecture([
                "Impossible de lire le fichier Excel.",
            ]);
        }
    };

    const handleImport = async () => {
        if (!saisonId) {
            setResultat({
                success: false,
                message: "Aucune saison active.",
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

        // On n'envoie pas les lignes avec nom/prénom manquants
        const lignesValides = lignes.filter(
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
            const { data, error } = await supabase.rpc(
                "import_chanteurs_saison",
                {
                    p_saison_id: saisonId,
                    p_chanteurs: lignesValides,
                }
            );

            if (error) {
                console.error(
                    "Erreur import chanteurs :",
                    error
                );

                setResultat({
                    success: false,
                    message: error.message,
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

    const reset = () => {
        setFichier(null);
        setLignes([]);
        setErreursLecture([]);
        setResultat(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div
            style={{
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "#fff",
            }}
        >
            <h2>
                Importer des chanteurs dans la saison ACTIVE
                <label className="icon-saisonactive"></label>
            </h2>

            <p>
                Importez un fichier Excel contenant les colonnes :
            </p>

            <ul>
                <li>Prénom</li>
                <li>Nom</li>
                <li>Groupe</li>
                <li>Numéro de téléphone</li>
                <li>Email</li>
                <li>Adresse postale</li>
                <li>Code postal</li>
                <li>Ville</li>
                <li>Date de naissance</li>
            </ul>

            {/* Sélection du fichier */}
            <div style={{ marginBottom: "20px" }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                />
            </div>

            {/* Nom du fichier */}
            {fichier && (
                <div
                    style={{
                        marginBottom: "20px",
                        padding: "10px",
                        background: "#f5f5f5",
                    }}
                >
                    <strong>Fichier :</strong>{" "}
                    {fichier.name}
                </div>
            )}

            {/* Erreurs de lecture */}
            {erreursLecture.length > 0 && (
                <div
                    style={{
                        marginBottom: "20px",
                        padding: "12px",
                        background: "#fff3f3",
                        border: "1px solid #ffcccc",
                        borderRadius: "5px",
                    }}
                >
                    <strong>
                        Erreurs détectées :
                    </strong>

                    <ul>
                        {erreursLecture.map(
                            (erreur, index) => (
                                <li key={index}>
                                    {erreur}
                                </li>
                            )
                        )}
                    </ul>
                </div>
            )}

            {/* Aperçu */}
            {lignes.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                    <h3>
                        Aperçu ({lignes.length} lignes)
                    </h3>

                    <div
                        style={{
                            overflowX: "auto",
                            maxHeight: "400px",
                            overflowY: "auto",
                        }}
                    >
                        <table
                            style={{
                                width: "100%",
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
                                        Groupe
                                    </th>
                                    <th style={thStyle}>
                                        Email
                                    </th>
                                    <th style={thStyle}>
                                        Téléphone
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
                                        Date de naissance
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {lignes.map(
                                    (ligne, index) => (
                                        <tr key={index}>
                                            <td style={tdStyle}>
                                                {
                                                    ligne.ligneExcel
                                                }
                                            </td>

                                            <td style={tdStyle}>
                                                {ligne.nom}
                                            </td>

                                            <td style={tdStyle}>
                                                {
                                                    ligne.prenom
                                                }
                                            </td>

                                            <td style={tdStyle}>
                                                {
                                                    ligne.groupe ||
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
                                                    ligne.telephone ||
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
                                                    ligne.date_naissance ||
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
                    display: "flex",
                    gap: "10px",
                }}
            >
                <button
                    type="button"
                    onClick={handleImport}
                    disabled={
                        loading ||
                        !lignes.length ||
                        !saisonId
                    }
                >
                    {loading
                        ? "Import en cours..."
                        : "Importer les chanteurs"}
                </button>

                <button
                    type="button"
                    onClick={reset}
                    disabled={loading}
                >
                    Annuler
                </button>
            </div>

            {/* Résultat */}
            {resultat && (
                <div
                    style={{
                        marginTop: "20px",
                        padding: "15px",
                        borderRadius: "5px",
                        background: resultat.success
                            ? "#f0fff4"
                            : "#fff3f3",
                        border: resultat.success
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

                            {resultat.data?.erreurs
                                ?.length > 0 && (
                                    <div>
                                        <strong>
                                            ⚠️ Erreurs :
                                        </strong>

                                        <ul>
                                            {resultat.data.erreurs.map(
                                                (
                                                    erreur,
                                                    index
                                                ) => (
                                                    <li
                                                        key={
                                                            index
                                                        }
                                                    >
                                                        {JSON.stringify(
                                                            erreur
                                                        )}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}


/**
 * Convertit une date provenant d'Excel
 * en YYYY-MM-DD pour PostgreSQL.
 */
function normaliserDateExcel(value) {
    if (!value) {
        return null;
    }

    const texte = String(value).trim();

    if (!texte) {
        return null;
    }

    // Déjà au format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(texte)) {
        return texte;
    }

    // Format français DD/MM/YYYY
    const matchFrancais = texte.match(
        /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
    );

    if (matchFrancais) {
        const [, jour, mois, annee] = matchFrancais;

        return `${annee}-${mois.padStart(
            2,
            "0"
        )}-${jour.padStart(2, "0")}`;
    }

    /*
     * Excel peut aussi fournir une date sous forme
     * de numéro de série.
     */
    if (!isNaN(value)) {
        const numero = Number(value);

        if (numero > 0) {
            const date = XLSX.SSF.parse_date_code(numero);

            if (
                date &&
                date.y &&
                date.m &&
                date.d
            ) {
                return `${date.y}-${String(
                    date.m
                ).padStart(2, "0")}-${String(
                    date.d
                ).padStart(2, "0")}`;
            }
        }
    }

    /*
     * Dernière tentative : date JavaScript.
     */
    const date = new Date(value);

    if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}-${String(
            date.getDate()
        ).padStart(2, "0")}`;
    }

    return null;
}


const thStyle = {
    border: "1px solid #ddd",
    padding: "8px",
    background: "#f5f5f5",
    textAlign: "left",
};

const tdStyle = {
    border: "1px solid #ddd",
    padding: "8px",
};
