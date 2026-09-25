import ExcelJS from "exceljs";

class ExcelService {

    // Export d'une seule feuille.
    // Compatible avec les appels existants.
    static exportToExcel(data = [], config = {}) {
        return this.exportSheetsToExcel(
            [{ data, config }],
            { fileName: config.fileName ?? "export" }
        );
    }

    // Export de plusieurs feuilles : un onglet par élément.
    static async exportSheetsToExcel(
        sheets = [],
        { fileName = "export" } = {}
    ) {
        if (sheets.length === 0) {
            return;
        }

        const workbook = new ExcelJS.Workbook();

        const usedNames = new Set();

        for (const { data = [], config = {} } of sheets) {

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

        URL.revokeObjectURL(url);
    }

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

        const exportColumns = columns.filter(column =>
            column.export !== false &&
            column.field &&
            column.header
        );

        if (exportColumns.length === 0) {
            console.warn(
                "ExcelService : aucune colonne à exporter."
            );

            return null;
        }

        /*
         * =========================================================
         * FEUILLE
         * =========================================================
         */

        const worksheet = workbook.addWorksheet(
            sheetName,
            {
                views: [
                    {
                        state: "frozen",

                        // Fige la première colonne
                        xSplit: 1,

                        // Fige la première ligne
                        ySplit: 1
                    }
                ]
            }
        );


        /*
         * =========================================================
         * HEADERS
         * =========================================================
         */

        const headers = exportColumns.map(column =>
            column.exportHeader ??
            column.header ??
            column.field
        );


        /*
         * =========================================================
         * DONNÉES
         * =========================================================
         */

        const rows = data.map(row =>
            exportColumns.map(column => {

                let value;

                if (
                    typeof column.exportValue ===
                    "function"
                ) {
                    value =
                        column.exportValue(row);

                } else if (
                    typeof column.sortValue ===
                    "function"
                ) {
                    value =
                        column.sortValue(row);

                } else {

                    value = this.getNestedValue(
                        row,
                        column.exportField ??
                        column.field
                    );
                }

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

                return this.normalizeValue(value);
            })
        );


        /*
         * =========================================================
         * TABLEAU EXCEL
         * =========================================================
         */

        worksheet.addTable({

            /*
             * Le nom interne du tableau doit être
             * unique et sans caractères spéciaux.
             */
            name:
                this.normalizeTableName(sheetName),

            /*
             * Commence en A1
             */
            ref: "A1",

            /*
             * Ligne d'en-tête
             */
            headerRow: true,

            /*
             * Pas de ligne de total
             */
            totalsRow: false,

            /*
             * Style Excel natif
             */
            style: {

                /*
                 * Tu peux changer le thème.
                 * Medium2 donne un tableau classique.
                 */
                theme: "TableStyleMedium2",

                /*
                 * Alternance de couleur des lignes
                 */
                showRowStripes: true,

                showColumnStripes: false
            },

            /*
             * Colonnes du tableau
             */
            columns: headers.map(header => ({
                name: header,

                /*
                 * Active le bouton de filtre Excel
                 */
                filterButton: true
            })),

            rows
        });


        /*
         * =========================================================
         * LARGEUR AUTOMATIQUE
         * =========================================================
         */

        if (autoWidth) {

            exportColumns.forEach(
                (column, index) => {

                    const header =
                        headers[index] ?? "";

                    const maxLength =
                        rows.reduce(
                            (max, row) =>
                                Math.max(
                                    max,
                                    String(
                                        row[index] ?? ""
                                    ).length
                                ),
                            String(header).length
                        );

                    worksheet.getColumn(
                        index + 1
                    ).width =
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

    static getNestedValue(object, path) {
        if (!path) {
            return "";
        }

        return path
            .split(".")
            .reduce(
                (value, key) =>
                    value?.[key],
                object
            );
    }

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

        if (
            typeof value === "object" &&
            !(value instanceof Date)
        ) {
            return JSON.stringify(value);
        }

        return value;
    }

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

    static normalizeSheetName(sheetName) {

        return String(
            sheetName || "Export"
        )
            .replace(
                /[:\\/?*\[\]\x00-\x1f]/g,
                "_"
            )
            .trim()
            .replace(/^'+|'+$/g, "")
            .substring(0, 31)
            .replace(/'+$/g, "") ||
            "Export";
    }

    static getUniqueSheetName(
        sheetName,
        usedNames
    ) {
        const base =
            this.normalizeSheetName(
                sheetName
            );

        let name = base;
        let number = 2;

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
                    31 - suffix.length
                ) +
                suffix;
        }

        usedNames.add(
            name.toLowerCase()
        );

        return name;
    }

    /*
     * Nom interne utilisé par Excel pour le tableau.
     *
     * Contrairement au nom de feuille,
     * il vaut mieux éviter espaces,
     * accents et caractères spéciaux.
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

        if (/^[0-9]/.test(result)) {
            result = `T_${result}`;
        }

        return `Table_${result}`;
    }
}

export default ExcelService;