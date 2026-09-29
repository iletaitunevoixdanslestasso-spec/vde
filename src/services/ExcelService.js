import ExcelJS from "exceljs";


class ExcelService {

    /*
     * =========================================================
     * EXPORT SIMPLE
     * =========================================================
     *
     * Export d'une seule feuille.
     *
     * Compatible avec les appels existants :
     *
     * ExcelService.exportToExcel(data, {
     *     columns,
     *     fileName,
     *     sheetName
     * });
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
                fileName:
                    config.fileName ??
                    "export"
            }
        );
    }


    /*
     * =========================================================
     * EXPORT MULTI-FEUILLES
     * =========================================================
     *
     * Format interne :
     *
     * [
     *     {
     *         data: [...],
     *         config: {
     *             sheetName: "...",
     *             columns: [...]
     *         }
     *     }
     * ]
     */

    static async exportSheetsToExcel(
        sheets = [],
        {
            fileName = "export"
        } = {}
    ) {

        if (!sheets || sheets.length === 0) {
            return;
        }


        /*
         * Création du classeur Excel.
         */

        const workbook =
            new ExcelJS.Workbook();


        /*
         * Informations facultatives du classeur.
         */

        workbook.creator =
            "Il était une voix dans l'est";

        workbook.created =
            new Date();


        /*
         * Permet d'éviter deux feuilles portant
         * exactement le même nom.
         */

        const usedNames =
            new Set();


        /*
         * Création des feuilles.
         */

        for (
            const {
                data = [],
                config = {}
            }
            of sheets
        ) {

            const sheetName =
                this.getUniqueSheetName(
                    config.sheetName ??
                    "Export",
                    usedNames
                );


            this.createWorksheet(
                workbook,
                sheetName,
                data,
                config
            );
        }


        /*
         * Génération du fichier XLSX.
         */

        const buffer =
            await workbook.xlsx.writeBuffer();


        /*
         * Création du fichier téléchargeable.
         */

        const blob =
            new Blob(
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


        link.href =
            url;


        link.download =
            `${this.normalizeFileName(fileName)}.xlsx`;


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        /*
         * On libère l'URL après le déclenchement
         * du téléchargement.
         */

        setTimeout(
            () => {
                URL.revokeObjectURL(url);
            },
            0
        );
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
            autoWidth = true
        } = config;


        /*
         * Colonnes exportables.
         *
         * Une colonne peut être exportée :
         * - soit via field
         * - soit via exportValue()
         */

        const exportColumns =
            columns.filter(column =>

                column.export !== false &&

                (
                    column.header ||
                    column.exportHeader
                ) &&

                (
                    column.field ||
                    typeof column.exportValue ===
                        "function"
                )
            );


        if (
            exportColumns.length === 0
        ) {

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

        const worksheet =
            workbook.addWorksheet(
                sheetName,
                {
                    views: [
                        {
                            state:
                                "frozen",

                            /*
                             * Fige la première colonne.
                             */

                            xSplit: 1,

                            /*
                             * Fige la première ligne.
                             */

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

        const headers =
            exportColumns.map(column =>

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

        const rows =
            data.map(row =>

                exportColumns.map(
                    column => {

                        let value;


                        /*
                         * Priorité :
                         *
                         * exportValue
                         * sortValue
                         * valeur du champ
                         */

                        if (
                            typeof column.exportValue ===
                            "function"
                        ) {

                            value =
                                column.exportValue(
                                    row
                                );

                        } else if (
                            typeof column.sortValue ===
                            "function"
                        ) {

                            value =
                                column.sortValue(
                                    row
                                );

                        } else {

                            value =
                                this.getNestedValue(
                                    row,
                                    column.exportField ??
                                    column.field
                                );
                        }


                        /*
                         * Format spécifique à l'export.
                         */

                        if (
                            typeof column.exportFormat ===
                            "function"
                        ) {

                            value =
                                column.exportFormat(
                                    value,
                                    row
                                );
                        }


                        return this.normalizeValue(
                            value
                        );
                    }
                )
            );


        /*
         * =====================================================
         * TABLEAU EXCEL
         * =====================================================
         */

        worksheet.addTable({

            /*
             * Le nom interne du tableau Excel
             * doit être unique.
             *
             * worksheet.id permet d'éviter les collisions.
             */

            name:
                this.normalizeTableName(
                    `${sheetName}_${worksheet.id}`
                ),


            /*
             * Le tableau commence en A1.
             */

            ref:
                "A1",


            /*
             * Ligne d'en-tête.
             */

            headerRow:
                true,


            /*
             * Pas de ligne de total.
             */

            totalsRow:
                false,


            /*
             * Style Excel natif.
             */

            style: {

                theme:
                    "TableStyleMedium2",

                showRowStripes:
                    true,

                showColumnStripes:
                    false
            },


            /*
             * Colonnes.
             *
             * filterButton active les filtres Excel.
             */

            columns:
                headers.map(header => ({
                    name:
                        String(header),

                    filterButton:
                        true
                })),


            rows
        });


        /*
         * =====================================================
         * LARGEUR AUTOMATIQUE
         * =====================================================
         */

        if (autoWidth) {

            exportColumns.forEach(
                (
                    column,
                    index
                ) => {

                    const header =
                        headers[index] ??
                        "";


                    const maxLength =
                        rows.reduce(
                            (
                                max,
                                row
                            ) =>

                                Math.max(
                                    max,

                                    String(
                                        row[index] ??
                                        ""
                                    ).length
                                ),

                            String(
                                header
                            ).length
                        );


                    worksheet
                        .getColumn(
                            index + 1
                        )
                        .width =

                        Math.min(
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
     *
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
                (
                    value,
                    key
                ) =>
                    value?.[key],

                object
            );
    }


    /*
     * =========================================================
     * NORMALISATION DES VALEURS
     * =========================================================
     */

    static normalizeValue(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        if (
            typeof value ===
            "boolean"
        ) {

            return value
                ? "Oui"
                : "Non";
        }


        /*
         * ExcelJS sait gérer directement
         * les objets Date.
         */

        if (
            value instanceof Date
        ) {

            return value;
        }


        /*
         * Evite d'envoyer [object Object]
         * dans Excel.
         */

        if (
            typeof value ===
            "object"
        ) {

            return JSON.stringify(
                value
            );
        }


        return value;
    }


    /*
     * =========================================================
     * NOM DU FICHIER
     * =========================================================
     */

    static normalizeFileName(
        fileName
    ) {

        return String(
            fileName ||
            "export"
        )
            .replace(
                /[<>:"/\\|?*]+/g,
                "_"
            )
            .trim() ||
            "export";
    }


    /*
     * =========================================================
     * NOM DE FEUILLE
     * =========================================================
     *
     * Contraintes Excel :
     *
     * maximum 31 caractères
     * certains caractères interdits
     */

    static normalizeSheetName(
        sheetName
    ) {

        return String(
            sheetName ||
            "Export"
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
            .substring(
                0,
                31
            )
            .replace(
                /'+$/g,
                ""
            ) ||
            "Export";
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

        const base =
            this.normalizeSheetName(
                sheetName
            );


        let name =
            base;


        let number =
            2;


        while (
            usedNames.has(
                name.toLowerCase()
            )
        ) {

            const suffix =
                ` (${number++})`;


            name =
                base.substring(
                    0,
                    31 -
                    suffix.length
                ) +
                suffix;
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

    static normalizeTableName(
        name
    ) {

        let result =
            String(
                name ||
                "Tableau"
            )
                .normalize(
                    "NFD"
                )
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

        if (
            /^[0-9]/.test(
                result
            )
        ) {

            result =
                `T_${result}`;
        }


        return `Table_${result}`;
    }


    /*
     * =========================================================
     * EXPORT MULTI-FEUILLES
     * =========================================================
     *
     * Compatibilité avec ton ancien appel.
     *
     * Tu peux continuer à utiliser :
     *
     * ExcelService.exportToExcelMultiSheets(
     *     sheets,
     *     { fileName }
     * );
     *
     * Format accepté :
     *
     * [
     *     {
     *         sheetName: "Chanson 1",
     *         columns: [...],
     *         data: [...]
     *     },
     *     {
     *         sheetName: "Chanson 2",
     *         columns: [...],
     *         data: [...]
     *     }
     * ]
     */

    static exportToExcelMultiSheets(
        sheets = [],
        {
            fileName = "Export"
        } = {}
    ) {

        /*
         * Conversion de l'ancien format
         * vers le format standard du service.
         */

        const formattedSheets =
            sheets.map(
                (
                    sheet,
                    index
                ) => ({

                    data:
                        sheet.data ??
                        [],

                    config: {

                        columns:
                            sheet.columns ??
                            [],

                        sheetName:
                            sheet.sheetName ??
                            `Feuille ${index + 1}`,

                        autoWidth:
                            sheet.autoWidth ??
                            true
                    }
                })
            );


        /*
         * Une seule librairie :
         * ExcelJS.
         */

        return this.exportSheetsToExcel(
            formattedSheets,
            {
                fileName
            }
        );
    }
}


export default ExcelService;