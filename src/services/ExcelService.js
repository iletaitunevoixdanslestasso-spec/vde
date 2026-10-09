
import ExcelJS from "exceljs";

class ExcelService {

    /*
     * =========================================================
     * EXPORT SIMPLE
     * =========================================================
     */

    static exportToExcel(data = [], config = {}) {

        return this.exportSheetsToExcel(
            [
                {
                    data,
                    config
                }
            ],
            {
                fileName: config.fileName ?? "export"
            }
        );
    }


    /*
     * =========================================================
     * EXPORT MULTI-FEUILLES
     * =========================================================
     */

    static async exportSheetsToExcel(
        sheets = [],
        { fileName = "export" } = {}
    ) {

        if (!sheets || sheets.length === 0) {
            return;
        }

        const workbook = new ExcelJS.Workbook();

        workbook.creator = "Il était une voix dans l'est";
        workbook.created = new Date();

        const usedNames = new Set();

        for (const {
            data = [],
            config = {}
        } of sheets) {

            const sheetName = this.getUniqueSheetName(
                config.sheetName ?? "Export",
                usedNames
            );

            this.createWorksheet(
                workbook,
                sheetName,
                data,
                config
            );
        }

        const buffer = await workbook.xlsx.writeBuffer();

        const blob = new Blob(
            [buffer],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download =
            `${this.normalizeFileName(fileName)}.xlsx`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 0);
    }


    /*
     * =========================================================
     * CREATION D'UNE FEUILLE
     * =========================================================
     */

    static createWorksheet(
        workbook,
        sheetName,
        data = [],
        config = {}
    ) {

        const {
            columns = [],
            autoWidth = true,
            rowStyle = null
        } = config;


        /*
         * Colonnes exportables
         */

        const exportColumns = columns.filter(column =>

            column.export !== false &&

            (
                column.header ||
                column.exportHeader
            ) &&

            (
                column.field ||
                typeof column.exportValue === "function"
            )
        );

        if (exportColumns.length === 0) {

            console.warn(
                "ExcelService : aucune colonne à exporter."
            );

            return null;
        }


        /*
         * =====================================================
         * FEUILLE
         * =====================================================
         */

        const worksheet = workbook.addWorksheet(
            sheetName,
            {
                views: [
                    {
                        state: "frozen",
                        xSplit: 1,
                        ySplit: 1
                    }
                ]
            }
        );


        /*
         * =====================================================
         * HEADERS
         * =====================================================
         */

        const headers = exportColumns.map(column =>

            column.exportHeader ??
            column.header ??
            column.field ??
            ""
        );


        /*
         * =====================================================
         * DONNEES
         * =====================================================
         */

        const rows = data.map(row =>

            exportColumns.map(column => {

                let value;

                /*
                 * Priorité :
                 * exportValue
                 * sortValue
                 * valeur du champ
                 */

                if (
                    typeof column.exportValue === "function"
                ) {

                    value = column.exportValue(row);

                } else if (
                    typeof column.sortValue === "function"
                ) {

                    value = column.sortValue(row);

                } else {

                    value = this.getNestedValue(
                        row,
                        column.exportField ?? column.field
                    );
                }


                /*
                 * Format spécifique à l'export
                 */

                if (
                    typeof column.exportFormat === "function"
                ) {

                    value = column.exportFormat(
                        value,
                        row
                    );
                }

                return this.normalizeValue(value);
            })
        );


        /*
         * =====================================================
         * TABLEAU EXCEL
         * =====================================================
         */

        worksheet.addTable({

            name: this.normalizeTableName(
                `${sheetName}_${worksheet.id}`
            ),

            ref: "A1",

            headerRow: true,

            totalsRow: false,

            style: {
                theme: "TableStyleMedium2",
                showRowStripes: true,
                showColumnStripes: false
            },

            columns: headers.map(header => ({
                name: String(header),
                filterButton: true
            })),

            rows
        });


        /*
         * =====================================================
         * STYLE PERSONNALISE DES LIGNES
         * =====================================================
         *
         * rowStyle est facultatif.
         *
         * Exemple :
         *
         * rowStyle: row => row.lead
         *     ? {
         *         fill: {
         *             type: "pattern",
         *             pattern: "solid",
         *             fgColor: { argb: "FFFFE699" }
         *         },
         *         font: { bold: true }
         *       }
         *     : null
         *
         * La ligne 1 contient les en-têtes.
         * Les données commencent à la ligne 2.
         */

        if (typeof rowStyle === "function") {

            data.forEach((item, rowIndex) => {

                const style = rowStyle(
                    item,
                    rowIndex
                );

                if (!style) {
                    return;
                }

                const excelRow = worksheet.getRow(
                    rowIndex + 2
                );

                /*
                 * Appliquer le style à toutes les
                 * colonnes exportées.
                 */

                for (
                    let colIndex = 1;
                    colIndex <= exportColumns.length;
                    colIndex++
                ) {

                    const cell = excelRow.getCell(
                        colIndex
                    );

                    cell.style = {
                        ...cell.style,
                        ...style,

                        ...(style.font && {
                            font: {
                                ...cell.font,
                                ...style.font
                            }
                        }),

                        ...(style.alignment && {
                            alignment: {
                                ...cell.alignment,
                                ...style.alignment
                            }
                        })
                    };
                }
            });
        }


        /*
         * =====================================================
         * LARGEUR AUTOMATIQUE
         * =====================================================
         */

        if (autoWidth) {

            exportColumns.forEach(
                (column, index) => {

                    const header = headers[index] ?? "";

                    const maxLength = rows.reduce(
                        (max, row) =>

                            Math.max(
                                max,
                                String(
                                    row[index] ?? ""
                                ).length
                            ),

                        String(header).length
                    );

                    worksheet
                        .getColumn(index + 1)
                        .width = Math.min(
                            Math.max(
                                maxLength + 2,
                                10
                            ),
                            50
                        );
                }
            );
        }

        return worksheet;
    }


    /*
     * =========================================================
     * LECTURE D'UN CHAMP IMBRIQUE
     * =========================================================
     *
     * Exemple :
     * exportField: "chanteurs.nom"
     */

    static getNestedValue(
        object,
        path
    ) {

        if (!path) {
            return "";
        }

        return String(path)
            .split(".")
            .reduce(
                (value, key) => value?.[key],
                object
            );
    }


    /*
     * =========================================================
     * NORMALISATION DES VALEURS
     * =========================================================
     */

    static normalizeValue(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        if (typeof value === "boolean") {

            return value ? "Oui" : "Non";
        }

        /*
         * ExcelJS gère directement les dates.
         */

        if (value instanceof Date) {
            return value;
        }

        /*
         * Evite [object Object].
         */

        if (typeof value === "object") {
            return JSON.stringify(value);
        }

        return value;
    }


    /*
     * =========================================================
     * NOM DU FICHIER
     * =========================================================
     */

    static normalizeFileName(fileName) {

        return String(
            fileName || "export"
        )
            .replace(
                /[<>:"/\\|?*]+/g,
                "_"
            )
            .trim() || "export";
    }


    /*
     * =========================================================
     * NOM DE FEUILLE
     * =========================================================
     *
     * Contraintes Excel :
     * maximum 31 caractères
     * certains caractères interdits
     */

    static normalizeSheetName(sheetName) {

        return String(
            sheetName || "Export"
        )
            .replace(
                /[:\\/?*\[\]\x00-\x1f]/g,
                "_"
            )
            .trim()
            .replace(
                /^'+|'+$/g,
                ""
            )
            .substring(0, 31)
            .replace(
                /'+$/g,
                ""
            ) || "Export";
    }


    /*
     * =========================================================
     * NOM DE FEUILLE UNIQUE
     * =========================================================
     */

    static getUniqueSheetName(
        sheetName,
        usedNames
    ) {

        const base = this.normalizeSheetName(
            sheetName
        );

        let name = base;
        let number = 2;

        while (
            usedNames.has(
                name.toLowerCase()
            )
        ) {

            const suffix = ` (${number++})`;

            name = base.substring(
                0,
                31 - suffix.length
            ) + suffix;
        }

        usedNames.add(
            name.toLowerCase()
        );

        return name;
    }


    /*
     * =========================================================
     * NOM INTERNE DU TABLEAU EXCEL
     * =========================================================
     */

    static normalizeTableName(name) {

        let result = String(
            name || "Tableau"
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-zA-Z0-9_]/g,
                "_"
            );

        /*
         * Un nom Excel ne doit pas commencer
         * par un chiffre.
         */

        if (/^[0-9]/.test(result)) {
            result = `T_${result}`;
        }

        return `Table_${result}`;
    }


    /*
     * =========================================================
     * EXPORT MULTI-FEUILLES
     * =========================================================
     *
     * Compatibilité avec les anciens appels.
     *
     * ExcelService.exportToExcelMultiSheets(
     *     sheets,
     *     { fileName }
     * );
     */

    static exportToExcelMultiSheets(
        sheets = [],
        {
            fileName = "Export"
        } = {}
    ) {

        /*
         * Conversion du format externe
         * vers le format standard du service.
         */

        const formattedSheets = sheets.map(
            (sheet, index) => ({

                data: sheet.data ?? [],

                config: {

                    columns:
                        sheet.columns ?? [],

                    sheetName:
                        sheet.sheetName ??
                        `Feuille ${index + 1}`,

                    autoWidth:
                        sheet.autoWidth ?? true,

                    /*
                     * Transmission du style
                     * personnalisé des lignes.
                     */
                    rowStyle:
                        sheet.rowStyle ?? null
                }
            })
        );

        return this.exportSheetsToExcel(
            formattedSheets,
            {
                fileName
            }
        );
    }


    /*
     * =========================================================
     * EXPORT GLOBAL : TOUTES LES CHANSONS DANS UN SEUL ONGLET
     * =========================================================
     *
     * Même entrée que exportToExcelMultiSheets().
     *
     * sheets = [
     *   { sheetName, columns, data, rowStyle },
     *   ...
     * ]
     */
    static async exportToExcelGroupedSheet(
        sheets = [],
        {
            fileName = "Repartition_globale",
            sheetName = "Repartition"
        } = {}
    ) {

        const groupes = sheets.filter(
            sheet =>
                Array.isArray(sheet.columns) &&
                sheet.columns.length > 1
        );

        if (!groupes.length) return;

        const workbook = new ExcelJS.Workbook();

        workbook.creator = "Il était une voix dans l'est";
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet(
            this.normalizeSheetName(sheetName),
            {
                views: [{
                    state: "frozen",
                    xSplit: 1,
                    ySplit: 2
                }]
            }
        );


        /*
         * =============================================
         * REGROUPEMENT DES CHANTEURS
         * =============================================
         *
         * Un même chanteur peut apparaître dans
         * plusieurs chansons, mais n'aura qu'une
         * seule ligne.
         */

        const chanteursMap = new Map();

        groupes.forEach((groupe, groupeIndex) => {

            (groupe.data ?? []).forEach(
                (chanteur, rowIndex) => {

                    const id =
                        chanteur.id ??
                        chanteur.chanteur_id;

                    const nomComplet =
                        `${chanteur.nom ?? ""} ${chanteur.prenom ?? ""}`
                            .trim();

                    const key = id ??
                        (
                            nomComplet
                                ? `nom:${nomComplet}`
                                : `ligne:${groupeIndex}:${rowIndex}`
                        );

                    if (!chanteursMap.has(key)) {
                        chanteursMap.set(key, {
                            chanteur,
                            parGroupe: new Map()
                        });
                    }

                    chanteursMap
                        .get(key)
                        .parGroupe
                        .set(groupeIndex, chanteur);
                }
            );
        });


        /*
         * =============================================
         * TRI ALPHABETIQUE
         * =============================================
         */

        const chanteurs = Array.from(
            chanteursMap.values()
        ).sort((a, b) => {

            const nomA =
                `${a.chanteur.nom ?? ""} ${a.chanteur.prenom ?? ""}`;

            const nomB =
                `${b.chanteur.nom ?? ""} ${b.chanteur.prenom ?? ""}`;

            return nomA.localeCompare(nomB, "fr");
        });


        /*
         * =============================================
         * CALCUL DES VALEURS
         * =============================================
         *
         * Même logique que l'export classique.
         */

        const getExportValue = (column, row) => {

            if (!row) return "";

            let value;

            if (
                typeof column.exportValue === "function"
            ) {

                value = column.exportValue(row);

            } else if (
                typeof column.sortValue === "function"
            ) {

                value = column.sortValue(row);

            } else {

                value = this.getNestedValue(
                    row,
                    column.exportField ?? column.field
                );
            }

            if (
                typeof column.exportFormat === "function"
            ) {

                value = column.exportFormat(
                    value,
                    row
                );
            }

            return this.normalizeValue(value);
        };


        /*
         * =============================================
         * COLONNE CHORISTES
         * =============================================
         */

        const nomColumn = groupes[0].columns[0];

        worksheet.getCell("A2").value =
            nomColumn.exportHeader ??
            nomColumn.header ??
            "Choristes";

        worksheet.getColumn(1).width = 29;


        /*
         * =============================================
         * EN-TETES PAR CHANSON
         * =============================================
         *
         * Ligne 1 : titres des chansons fusionnés
         * Ligne 2 : Lead, pupitres...
         */

        let numeroColonne = 2;

        const bandeaux = [];

        groupes.forEach((groupe, groupeIndex) => {

            const colonnes = groupe.columns
                .slice(1)
                .filter(column => column.export !== false);

            const debut = numeroColonne;

            colonnes.forEach(column => {

                const cell = worksheet.getCell(
                    2,
                    numeroColonne
                );

                cell.value =
                    column.exportHeader ??
                    column.header ??
                    column.field ??
                    "";

                worksheet.getColumn(numeroColonne).width =
                    Math.min(
                        Math.max(
                            String(cell.value).length + 3,
                            12
                        ),
                        23
                    );

                numeroColonne++;
            });

            const fin = numeroColonne - 1;

            if (fin < debut) return;

            /*
             * Fusionner les cellules portant
             * le titre de la chanson.
             */

            if (fin > debut) {
                worksheet.mergeCells(
                    1,
                    debut,
                    1,
                    fin
                );
            }

            const titreCell = worksheet.getCell(
                1,
                debut
            );

            titreCell.value =
                groupe.sheetName ??
                `Chanson ${groupeIndex + 1}`;

            titreCell.alignment = {
                horizontal: "center",
                vertical: "middle"
            };

            titreCell.font = {
                name: "Calibri",
                bold: true,
                size: 12,
                color: { argb: "FF17324D" }
            };

            /*
             * Couleurs légèrement alternées
             * pour distinguer les chansons.
             */

            for (
                let col = debut;
                col <= fin;
                col++
            ) {

                worksheet.getCell(1, col).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb: groupeIndex % 2 === 0
                            ? "FFEAF4FF" // Bleu clair
                            : "FFDDEBF7" // Blanc
                    }
                };
            }

            bandeaux.push({
                debut,
                fin,
                colonnes,
                groupeIndex
            });
        });



        /*
         * =============================================
         * STYLE DES EN-TETES
         * =============================================
         */

        const derniereColonne = numeroColonne - 1;

        worksheet.getRow(1).height = 28;
        worksheet.getRow(2).height = 25;


        /*
         * Colonne Choristes : en-tête bleu foncé.
         */

        const headerChoristes = worksheet.getCell(2, 1);

        headerChoristes.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" }
        };

        headerChoristes.font = {
            name: "Calibri",
            bold: true,
            color: { argb: "FFFFFFFF" }
        };

        headerChoristes.alignment = {
            horizontal: "left",
            vertical: "middle"
        };


        /*
         * Colonnes des chansons :
         * alternance bleu clair / blanc.
         */

        bandeaux.forEach(({
            debut,
            fin,
            groupeIndex
        }) => {

            const fond = groupeIndex % 2 === 0
                ? "FFEAF4FF"
                : "FFDDEBF7";

            for (
                let col = debut;
                col <= fin;
                col++
            ) {

                const cell = worksheet.getCell(2, col);

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: fond }
                };

                cell.font = {
                    name: "Calibri",
                    bold: true,
                    color: { argb: "FF17324D" }
                };

                cell.alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                cell.border = {
                    bottom: {
                        style: "medium",
                        color: { argb: "FF4472C4" }
                    }
                };
            }
        });



        /*
         * =============================================
         * DONNEES DES CHANTEURS
         * =============================================
         */

        chanteurs.forEach((item, index) => {

            /*
             * Les lignes 1 et 2 sont réservées
             * aux en-têtes.
             */

            const excelRow = worksheet.getRow(
                index + 3
            );

            const {
                chanteur,
                parGroupe
            } = item;

            excelRow.getCell(1).value =
                getExportValue(
                    nomColumn,
                    chanteur
                );


            /*
             * Chaque chanson fournit ses propres
             * colonnes sur la même ligne.
             */

            bandeaux.forEach(({
                debut,
                colonnes,
                groupeIndex
            }) => {

                const infoChanson =
                    parGroupe.get(groupeIndex);

                colonnes.forEach(
                    (column, colIndex) => {

                        excelRow.getCell(
                            debut + colIndex
                        ).value = getExportValue(
                            column,
                            infoChanson
                        );
                    }
                );
            });


            /*
             * =====================================
             * SURBRILLANCE DES LEADS
             * =====================================
             *
             * Un chanteur lead dans au moins
             * une chanson : toute sa ligne
             * est mise en évidence.
             *
             * On réutilise le rowStyle défini
             * dans RepresentationsChoeur.
             */

            let styleLead = null;


            /*
             * =============================================
             * STYLE COLONNE CHORISTES
             * =============================================
             *
             * Toujours blanche.
             */

            const celluleNom = excelRow.getCell(1);

            celluleNom.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFFFFF" }
            };

            celluleNom.font = {
                name: "Calibri",
                size: 11,
                color: { argb: "FF24344A" }
            };

            celluleNom.alignment = {
                horizontal: "left",
                vertical: "middle"
            };

            celluleNom.border = {
                bottom: {
                    style: "hair",
                    color: { argb: "FFE4EAF2" }
                }
            };


            /*
             * =============================================
             * STYLE PAR CHANSON
             * =============================================
             *
             * Chaque chanson possède :
             * - ses colonnes
             * - sa couleur de fond
             * - ses propres chanteurs lead
             */

            bandeaux.forEach(({
                debut,
                fin,
                groupeIndex
            }) => {

                const groupe = groupes[groupeIndex];

                const infoChanson =
                    parGroupe.get(groupeIndex);


                /*
                 * Couleur normale de la chanson.
                 *
                 * Chanson 0 : bleu clair
                 * Chanson 1 : blanc
                 * Chanson 2 : bleu clair
                 * Chanson 3 : blanc
                 */

                const couleurFond =
                    groupeIndex % 2 === 0
                        ? "FFEAF4FF"
                        : "FFDDEBF7";


                /*
                 * Déterminer si le chanteur est
                 * lead pour CETTE chanson.
                 */

                const estLead =
                    infoChanson?.lead === true;


                /*
                 * Récupération éventuelle du style
                 * défini dans RepresentationsChoeur.
                 */

                const stylePersonnalise =
                    estLead &&
                        typeof groupe.rowStyle === "function"
                        ? groupe.rowStyle(infoChanson, index)
                        : null;


                /*
                 * Style uniquement sur les colonnes
                 * de cette chanson.
                 */

                for (
                    let col = debut;
                    col <= fin;
                    col++
                ) {

                    const cell = excelRow.getCell(col);


                    /*
                     * Couleur de fond.
                     *
                     * Lead : jaune
                     * Autre : couleur de la chanson
                     */

                    cell.fill = estLead
                        ? (
                            stylePersonnalise?.fill ?? {
                                type: "pattern",
                                pattern: "solid",
                                fgColor: {
                                    argb: "FFFFE699"
                                }
                            }
                        )
                        : {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: {
                                argb: couleurFond
                            }
                        };


                    /*
                     * Police.
                     */

                    cell.font = {
                        name: "Calibri",
                        size: 11,
                        color: { argb: "FF24344A" },
                        bold: estLead,
                        ...(stylePersonnalise?.font ?? {})
                    };


                    /*
                     * Alignement.
                     */

                    cell.alignment = {
                        horizontal: "center",
                        vertical: "middle",
                        ...(stylePersonnalise?.alignment ?? {})
                    };


                    /*
                     * Bordure horizontale.
                     */

                    cell.border = {
                        bottom: {
                            style: "hair",
                            color: {
                                argb: "FFE4EAF2"
                            }
                        }
                    };
                }
            });

            excelRow.height = 20;


        });


        /*
         * =============================================
         * FILTRES EXCEL
         * =============================================
         *
         * Contrairement à addTable(), autoFilter
         * accepte les noms de colonnes répétés
         * (Lead, Alti, etc.).
         */

        worksheet.autoFilter = {
            from: {
                row: 2,
                column: 1
            },
            to: {
                row: 2,
                column: derniereColonne
            }
        };


        /*
         * =============================================
         * TELECHARGEMENT
         * =============================================
         */

        const buffer =
            await workbook.xlsx.writeBuffer();

        const blob = new Blob(
            [buffer],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `${this.normalizeFileName(fileName)}.xlsx`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 0);
    }

}

export default ExcelService;
