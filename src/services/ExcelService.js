import * as XLSX from "xlsx";

class ExcelService {

    // Export d'une seule chanson.
    // Compatible avec les appels existants.
    static exportToExcel(data = [], config = {}) {
        return this.exportSheetsToExcel(
            [{ data, config }],
            { fileName: config.fileName ?? "export" }
        );
    }

    // Export de plusieurs chansons : un onglet par chanson.
    // Chaque entrée utilise les mêmes data et columns que DataTable.
    static exportSheetsToExcel(
        sheets = [],
        { fileName = "export" } = {}
    ) {
        if (sheets.length === 0) {
            return;
        }

        const workbook = XLSX.utils.book_new();
        const usedNames = new Set();

        for (const { data = [], config = {} } of sheets) {
            const worksheet = this.createWorksheet(data, config);

            if (!worksheet) {
                return;
            }

            const sheetName = this.getUniqueSheetName(
                config.sheetName ?? "Export",
                usedNames
            );

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                sheetName
            );
        }

        XLSX.writeFile(
            workbook,
            `${this.normalizeFileName(fileName)}.xlsx`
        );
    }

    // Construit une feuille sans déclencher de téléchargement.
    static createWorksheet(data = [], config = {}) {
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
            console.warn("ExcelService : aucune colonne à exporter.");
            return null;
        }

        const headers = exportColumns.map(column =>
            column.exportHeader ??
            column.header ??
            column.field
        );

        const rows = data.map(row =>
            exportColumns.map(column => {
                let value;

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

                if (typeof column.exportFormat === "function") {
                    value = column.exportFormat(value, row);
                }

                return this.normalizeValue(value);
            })
        );

        const worksheet = XLSX.utils.aoa_to_sheet([
            headers,
            ...rows
        ]);

        if (autoWidth) {
            worksheet["!cols"] = exportColumns.map((column, index) => {
                const maxLength = rows.reduce(
                    (max, row) =>
                        Math.max(
                            max,
                            String(row[index] ?? "").length
                        ),
                    String(headers[index] ?? "").length
                );

                return {
                    wch: Math.min(Math.max(maxLength + 2, 10), 50)
                };
            });
        }

        if (worksheet["!ref"] && rows.length > 0) {
            worksheet["!autofilter"] = {
                ref: worksheet["!ref"]
            };
        }

        return worksheet;
    }

    static getNestedValue(object, path) {
        if (!path) {
            return "";
        }

        return path
            .split(".")
            .reduce((value, key) => value?.[key], object);
    }

    static normalizeValue(value) {
        if (value === null || value === undefined) {
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
        return String(fileName || "export")
            .replace(/[<>:"/\\|?*]+/g, "_")
            .trim() || "export";
    }

    static normalizeSheetName(sheetName) {
        return String(sheetName || "Export")
            .replace(/[:\\/?*\[\]\x00-\x1f]/g, "_")
            .trim()
            .replace(/^'+|'+$/g, "")
            .substring(0, 31)
            .replace(/'+$/g, "") || "Export";
    }

    // Évite les doublons, y compris après troncature du titre.
    static getUniqueSheetName(sheetName, usedNames) {
        const base = this.normalizeSheetName(sheetName);

        let name = base;
        let number = 2;

        while (usedNames.has(name.toLowerCase())) {
            const suffix = ` (${number++})`;

            name =
                base.substring(0, 31 - suffix.length) +
                suffix;
        }

        usedNames.add(name.toLowerCase());

        return name;
    }
}

export default ExcelService;