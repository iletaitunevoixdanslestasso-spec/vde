import React, { useEffect, useMemo, useState } from "react";

export default function DataTable({
    data = [],
    config = {},
    onAction,
}) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const dragAndDrop = config.dragAndDrop === true;
    const orderField = config.orderField || "ordre";

    const [sort, setSort] = useState({
        field: null,
        direction: "asc"
    });

    const columns = (config.columns || []).filter(
        c => !c.hideInTable
    );

    const actions = config.actions || [];
    const [draggedRow, setDraggedRow] = useState(null);

    /*
     * =========================================================
     * DRAG AND DROP
     * =========================================================
     */

    const handleDragStart = (row) => {
        setDraggedRow(row);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (targetRow) => {

        if (!draggedRow) {
            return;
        }

        if (draggedRow.id === targetRow.id) {
            setDraggedRow(null);
            return;
        }

        const newData = [...data];

        const fromIndex = newData.findIndex(
            row => row.id === draggedRow.id
        );

        const toIndex = newData.findIndex(
            row => row.id === targetRow.id
        );

        if (fromIndex === -1 || toIndex === -1) {
            setDraggedRow(null);
            return;
        }

        const [movedRow] =
            newData.splice(fromIndex, 1);

        newData.splice(toIndex, 0, movedRow);

        setDraggedRow(null);

        // À gérer ensuite pour sauvegarder
    };

    /*
     * =========================================================
     * 🔍 RECHERCHE
     * =========================================================
     */

    const filteredData = useMemo(() => {

        if (!search) {
            return data;
        }

        const searchValue = search
            .toLowerCase()
            .trim();

        const containsSearch = (value) => {

            if (value == null) {
                return false;
            }

            if (
                typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean"
            ) {
                return String(value)
                    .toLowerCase()
                    .includes(searchValue);
            }

            if (Array.isArray(value)) {
                return value.some(item =>
                    containsSearch(item)
                );
            }

            if (typeof value === "object") {
                return Object.values(value).some(item =>
                    containsSearch(item)
                );
            }

            return false;
        };

        return data.filter(row =>
            containsSearch(row)
        );

    }, [data, search]);


    /*
     * =========================================================
     * 🔃 TRI
     * =========================================================
     */

    const sortedData = useMemo(() => {

        if (!sort.field) {
            return filteredData;
        }

        const column = columns.find(
            col => col.field === sort.field
        );

        if (!column) {
            return filteredData;
        }

        return [...filteredData].sort((a, b) => {

            const valueA = column.sortValue
                ? column.sortValue(a)
                : a[column.field];

            const valueB = column.sortValue
                ? column.sortValue(b)
                : b[column.field];


            /*
             * NULL
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
             * NOMBRES
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
             * DATES
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
             * TEXTE
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

            if (current.field === field) {

                return {
                    field,
                    direction:
                        current.direction === "asc"
                            ? "desc"
                            : "asc"
                };
            }

            return {
                field,
                direction: "asc"
            };

        });

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

        if (
            totalPages === 0 &&
            page !== 1
        ) {
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
        <div className="data-table">


            {/* =================================================
                RECHERCHE + PAGE SIZE
            ================================================= */}

            <div className="data-table-toolbar">

                <select
                    className="data-table-page-size"
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

                    <option value={100}>
                        100 par page
                    </option>

                </select>


                <input
                    className="data-table-search"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => {

                        setSearch(e.target.value);
                        setPage(1);

                    }}
                />

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <table className="data-table-table">

                <thead>

                    <tr>

                        {columns.map((col) => (

                            <th
                                key={col.field}
                                onClick={() =>
                                    handleSort(col.field)
                                }
                                className="data-table-header"
                            >

                                {col.header}


                                {sort.field === col.field && (

                                    <span className={
                                        sort.direction === "asc"
                                            ? "icon-sort-asc"
                                            : "icon-sort-desc"
                                    } />

                                )}

                            </th>

                        ))}


                        {actions.length > 0 && (

                            <th className="data-table-actions-header">
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
                                    (
                                        actions.length > 0
                                            ? 1
                                            : 0
                                    )
                                }
                                className="data-table-empty"
                            >
                                Aucun résultat
                            </td>

                        </tr>

                    )}


                    {paginatedData.map((row) => (

                        <tr
                            key={row.id}
                            className="data-table-row"
                        >

                            {columns.map((col) => (

                                <td
                                    key={col.field}
                                    className="data-table-cell"
                                >

                                    {(() => {
                                        const value = col.render
                                            ? col.render(
                                                row[col.field],
                                                row
                                            )
                                            : row[col.field];

                                        if (
                                            value &&
                                            typeof value === "object" &&
                                            !React.isValidElement(value)
                                        ) {
                                            return (
                                                <span className={value.cssClass || ""} title={value.title || ""} alt={value.title || ""}>
                                                    {value.value}
                                                </span>
                                            );
                                        }

                                        return value;
                                    })()}

                                </td>

                            ))}


                            {actions.length > 0 && (

                                <td className="data-table-actions">

                                    {actions
                                        .filter((a) => {

                                            if (
                                                typeof a.condition ===
                                                "function"
                                            ) {
                                                return a.condition(row);
                                            }

                                            return true;

                                        })
                                        .map((a, i) => (

                                            <button
                                                key={i}
                                                className={
                                                    `data-table-action ${a.cssClass || ""}`
                                                }
                                                title={a.title ?? a.label}
                                                alt={a.title ?? a.label}
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
                PAGINATION
            ================================================= */}

            {totalPages > 1 && (

                <div className="data-table-pagination">

                    {Array.from(
                        {
                            length: totalPages
                        },
                        (_, i) => i + 1
                    ).map((p) => (

                        <button
                            key={p}
                            className={
                                p === page
                                    ? "data-table-page active"
                                    : "data-table-page"
                            }
                            onClick={() =>
                                setPage(p)
                            }
                        >
                            {p}
                        </button>

                    ))}

                </div>

            )}

        </div>
    );
}