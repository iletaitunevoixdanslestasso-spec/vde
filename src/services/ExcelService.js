import * as XLSX from "xlsx";




class ExcelService {

    static exportToExcel(data = [], config = {}) {

        const {
            columns = [],
            fileName = "export",
            sheetName = "Export",
            autoWidth = true
        } = config;


        /*
         * Colonnes exportables
         *
         * Par défaut :
         * - il faut un field
         * - il faut un header
         * - export: false permet d'exclure explicitement
         */
        const exportColumns = columns.filter(column =>
            column.export !== false &&
            column.field &&
            column.header
        );


        if (exportColumns.length === 0) {
            console.warn(
                "ExcelService : aucune colonne à exporter."
            );

            return;
        }


        /*
         * Première ligne : headers
         */
        const headers = exportColumns.map(column =>
            column.exportHeader ??
            column.header ??
            column.field
        );


        /*
         * Lignes Excel
         */
        const rows = data.map(row => {

            return exportColumns.map(column => {

                let value;


                /*
                 * Valeur Excel personnalisée
                 */
                if (typeof column.exportValue === "function") {

                    value = column.exportValue(row);

                } else if (typeof column.sortValue === "function") {

                    value = column.sortValue(row);

                } else {

                    value = this.getNestedValue(
                        row,
                        column.exportField ?? column.field
                    );
                }


                /*
                 * Formatage Excel personnalisé
                 */
                if (
                    typeof column.exportFormat === "function"
                ) {

                    value =
                        column.exportFormat(
                            value,
                            row
                        );
                }


                return this.normalizeValue(value);
            });
        });


        /*
         * Création feuille
         */
        const worksheet =
            XLSX.utils.aoa_to_sheet([
                headers,
                ...rows
            ]);


        /*
         * Largeur automatique
         */
        if (autoWidth) {

            worksheet["!cols"] =
                exportColumns.map((column, index) => {

                    const values = [
                        headers[index],
                        ...rows.map(
                            row => row[index]
                        )
                    ];

                    const maxLength =
                        Math.max(
                            ...values.map(value =>
                                String(
                                    value ?? ""
                                ).length
                            )
                        );

                    return {
                        wch: Math.min(
                            Math.max(
                                maxLength + 2,
                                10
                            ),
                            50
                        )
                    };
                });
        }


        /*
         * Autofilter
         */
        if (
            worksheet["!ref"] &&
            rows.length > 0
        ) {

            const range =
                XLSX.utils.decode_range(
                    worksheet["!ref"]
                );

            worksheet["!autofilter"] = {
                ref:
                    XLSX.utils.encode_range({
                        s: {
                            r: 0,
                            c: range.s.c
                        },
                        e: {
                            r: 0,
                            c: range.e.c
                        }
                    })
            };
        }


        /*
         * Workbook
         */
        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            this.normalizeSheetName(
                sheetName
            )
        );


        /*
         * Téléchargement
         */
        XLSX.writeFile(
            workbook,
            `${this.normalizeFileName(fileName)}.xlsx`
        );
    }


    /*
     * Permet :
     *
     * field: "nom"
     *
     * mais aussi :
     *
     * field: "chanteur.nom"
     */
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

            return value
                ? "Oui"
                : "Non";
        }


        /*
         * Evite [object Object]
         */
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
            .trim();
    }


    static normalizeSheetName(sheetName) {

        return String(
            sheetName || "Export"
        )
            .replace(
                /[:\\/?*\[\]]/g,
                "_"
            )
            .substring(0, 31);
    }

}


export default ExcelService;