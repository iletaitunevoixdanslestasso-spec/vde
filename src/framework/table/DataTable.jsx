import { useEffect, useMemo, useState } from "react";

export default function DataTable({
    data = [],
    config = {},
    onAction,
}) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [sort, setSort] = useState({
        field: null,
        direction: "asc"
    });

    const columns = (config.columns || []).filter(
        c => !c.hideInTable
    );

    const actions = config.actions || [];


    /*
     * =========================================================
     * 🔍 RECHERCHE
     * =========================================================
     */

    const filteredData = useMemo(() => {

        if (!search) {
            return data;
        }

        const searchValue = search.toLowerCase();

        return data.filter((row) =>
            columns.some((col) => {

                let value;

                /*
                 * Pour la recherche, on utilise également
                 * sortValue si la colonne en possède un.
                 */
                if (col.sortValue) {
                    value = col.sortValue(row);
                } else {
                    value = row[col.field];
                }

                return String(value ?? "")
                    .toLowerCase()
                    .includes(searchValue);
            })
        );

    }, [data, search, columns]);


    /*
     * =========================================================
     * 🔃 TRI
     * =========================================================
     */

    const sortedData = useMemo(() => {

        /*
         * Aucun tri demandé
         */
        if (!sort.field) {
            return filteredData;
        }

        /*
         * On récupère la définition de la colonne
         */
        const column = columns.find(
            col => col.field === sort.field
        );

        if (!column) {
            return filteredData;
        }

        return [...filteredData].sort((a, b) => {

            /*
             * Si sortValue existe, on l'utilise.
             *
             * Exemple :
             *
             * sortValue: row =>
             *     `${row.chanteurs.prenom} ${row.chanteurs.nom}`
             *
             * ou :
             *
             * sortValue: row =>
             *     isPupitreValide(row, chansonPupitre) ? 1 : 0
             */
            const valueA = column.sortValue
                ? column.sortValue(a)
                : a[column.field];

            const valueB = column.sortValue
                ? column.sortValue(b)
                : b[column.field];


            /*
             * Gestion des valeurs null / undefined
             */

            if (valueA == null && valueB == null) {
                return 0;
            }

            if (valueA == null) {
                return 1;
            }

            if (valueB == null) {
                return -1;
            }


            /*
             * 🔢 NOMBRES
             */

            if (
                typeof valueA === "number" &&
                typeof valueB === "number"
            ) {
                return sort.direction === "asc"
                    ? valueA - valueB
                    : valueB - valueA;
            }


            /*
             * 📅 DATES
             *
             * Si les valeurs ressemblent à des dates,
             * on essaie de les comparer comme telles.
             */

            if (
                valueA instanceof Date ||
                valueB instanceof Date
            ) {
                const dateA = new Date(valueA);
                const dateB = new Date(valueB);

                return sort.direction === "asc"
                    ? dateA - dateB
                    : dateB - dateA;
            }


            /*
             * 🔤 TEXTE
             *
             * localeCompare permet notamment de gérer
             * correctement les accents français.
             *
             * numeric: true permet par exemple :
             *
             * 1
             * 2
             * 10
             *
             * plutôt que :
             *
             * 1
             * 10
             * 2
             */

            const comparison = String(valueA).localeCompare(
                String(valueB),
                "fr",
                {
                    numeric: true,
                    sensitivity: "base"
                }
            );

            return sort.direction === "asc"
                ? comparison
                : -comparison;

        });

    }, [
        filteredData,
        sort,
        columns
    ]);


    /*
     * =========================================================
     * 📄 PAGINATION
     * =========================================================
     */

    const totalPages = Math.ceil(
        sortedData.length / pageSize
    );


    const paginatedData = useMemo(() => {

        const start = (page - 1) * pageSize;

        return sortedData.slice(
            start,
            start + pageSize
        );

    }, [
        sortedData,
        page,
        pageSize
    ]);


    /*
     * =========================================================
     * 🔃 CHANGEMENT DE TRI
     * =========================================================
     */

    const handleSort = (field) => {

        setSort((current) => {

            /*
             * Même colonne :
             *
             * asc → desc
             * desc → asc
             */

            if (current.field === field) {

                return {
                    field,
                    direction:
                        current.direction === "asc"
                            ? "desc"
                            : "asc"
                };
            }


            /*
             * Nouvelle colonne :
             * on commence en ascendant
             */

            return {
                field,
                direction: "asc"
            };

        });

        /*
         * Quand on change le tri,
         * on revient à la première page.
         */

        setPage(1);
    };


    /*
     * =========================================================
     * 🔄 CORRECTION DE PAGE
     * =========================================================
     */

    useEffect(() => {

        if (
            totalPages > 0 &&
            page > totalPages
        ) {
            setPage(totalPages);
        }

        /*
         * S'il n'y a aucune donnée,
         * on reste sur la page 1.
         */

        if (totalPages === 0 && page !== 1) {
            setPage(1);
        }

    }, [
        totalPages,
        page
    ]);


    /*
     * =========================================================
     * 🖥️ AFFICHAGE
     * =========================================================
     */

    return (
        <div
            style={{
                fontFamily: "Arial"
            }}
        >

            {/* =================================================
                🔍 SEARCH + PAGE SIZE
            ================================================= */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10
                }}
            >

                <select
                    value={pageSize}
                    onChange={(e) => {

                        setPageSize(
                            Number(e.target.value)
                        );

                        setPage(1);
                    }}
                >

                    <option value={5}>
                        5 par page
                    </option>

                    <option value={10}>
                        10 par page
                    </option>

                    <option value={25}>
                        25 par page
                    </option>

                    <option value={50}>
                        50 par page
                    </option>

                </select>


                <input
                    placeholder="🔍 Rechercher..."
                    value={search}
                    onChange={(e) => {

                        setSearch(e.target.value);
                        setPage(1);

                    }}
                    style={{
                        padding: 6,
                        width: 250
                    }}
                />

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    background: "white"
                }}
            >

                <thead>

                    <tr
                        style={{
                            background: "#f5f5f5"
                        }}
                    >

                        {columns.map((col) => (

                            <th
                                key={col.field}
                                onClick={() =>
                                    handleSort(col.field)
                                }
                                style={{
                                    textAlign: "left",
                                    padding: 10,
                                    borderBottom:
                                        "1px solid #ddd",
                                    cursor: "pointer",
                                    userSelect: "none"
                                }}
                            >

                                {col.header}


                                {/* Indicateur de tri */}

                                {sort.field === col.field && (
                                    <span
                                        style={{
                                            marginLeft: 5
                                        }}
                                    >
                                        {sort.direction === "asc"
                                            ? "↑"
                                            : "↓"
                                        }
                                    </span>
                                )}

                            </th>

                        ))}


                        {actions.length > 0 && (

                            <th
                                style={{
                                    padding: 10
                                }}
                            >
                                Actions
                            </th>

                        )}

                    </tr>

                </thead>


                <tbody>

                    {paginatedData.length === 0 && (

                        <tr>

                            <td
                                colSpan={
                                    columns.length +
                                    (actions.length > 0 ? 1 : 0)
                                }
                                style={{
                                    padding: 20,
                                    textAlign: "center",
                                    color: "#777"
                                }}
                            >
                                Aucun résultat
                            </td>

                        </tr>

                    )}


                    {paginatedData.map((row) => (

                        <tr
                            key={row.id}
                            style={{
                                borderBottom:
                                    "1px solid #eee"
                            }}
                        >

                            {columns.map((col) => (

                                <td
                                    key={col.field}
                                    style={{
                                        padding: 10
                                    }}
                                >

                                    {col.render
                                        ? col.render(
                                            row[col.field],
                                            row
                                        )
                                        : row[col.field]
                                    }

                                </td>

                            ))}


                            {actions.length > 0 && (

                                <td>

                                    {actions.map((a, i) => (

                                        <button
                                            key={i}
                                            onClick={() =>
                                                onAction(
                                                    a.action,
                                                    row
                                                )
                                            }
                                        >
                                            {a.label}
                                        </button>

                                    ))}

                                </td>

                            )}

                        </tr>

                    ))}

                </tbody>

            </table>


            {/* =================================================
                📄 PAGINATION
            ================================================= */}

            {totalPages > 1 && (

                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: 10,
                        gap: 5
                    }}
                >

                    {Array.from(
                        {
                            length: totalPages
                        },
                        (_, i) => i + 1
                    ).map((p) => (

                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            style={{
                                padding: "5px 10px",
                                background:
                                    p === page
                                        ? "#333"
                                        : "#eee",
                                color:
                                    p === page
                                        ? "white"
                                        : "black",
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            {p}
                        </button>

                    ))}

                </div>

            )}

        </div>
    );
}