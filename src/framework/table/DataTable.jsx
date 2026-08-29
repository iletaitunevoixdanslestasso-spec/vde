import React, { useEffect, useMemo, useState } from "react";
import "./DataTable.css"

export default function DataTable({
    data = [],
    config = {},
    onAction,
    onReorder
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

    const [draggedRow, setDraggedRow] = useState(null);

    const columns = (config.columns || []).filter(
        c => !c.hideInTable
    );

    const actions = config.actions || [];


    /*
     * =========================================================
     * DRAG & DROP
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

        const [movedRow] = newData.splice(fromIndex, 1);

        newData.splice(toIndex, 0, movedRow);

        setDraggedRow(null);

        const reorderedData = newData.map((row, index) => ({
            ...row,
            [orderField]: index + 1
        }));

        onReorder?.(reorderedData);
    };


    /*
     * =========================================================
     * RECHERCHE
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
     * TRI
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

            if (valueA == null && valueB == null) {
                return 0;
            }

            if (valueA == null) {
                return 1;
            }

            if (valueB == null) {
                return -1;
            }

            if (
                typeof valueA === "number" &&
                typeof valueB === "number"
            ) {
                return sort.direction === "asc"
                    ? valueA - valueB
                    : valueB - valueA;
            }

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

    }, [filteredData, sort, columns]);


    /*
     * =========================================================
     * PAGINATION
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

    }, [sortedData, page, pageSize]);


    /*
     * =========================================================
     * TRI
     * =========================================================
     */

    const handleSort = (field) => {

        setSort(current => {

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
     * PAGE
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

    }, [totalPages, page]);


    /*
     * =========================================================
     * RENDU VALEUR
     * =========================================================
     */

    const renderValue = (column, row) => {

        const value = column.render
            ? column.render(
                row[column.field],
                row
            )
            : row[column.field];

        if (
            value &&
            typeof value === "object" &&
            !React.isValidElement(value)
        ) {
            return (
                <span
                    className={
                        `data-table-value ${value.cssClass || ""}`
                    }
                    title={value.title || ""}
                >
                    {value.value}
                </span>
            );
        }

        return value;
    };


    /*
     * =========================================================
     * ACTIONS
     * =========================================================
     */

    const renderActions = (row) => {

        const visibleActions = actions.filter(action => {

            if (typeof action.condition === "function") {
                return action.condition(row);
            }

            return true;
        });

        if (visibleActions.length === 0) {
            return null;
        }

        return (
            <div className="data-table-actions">

                {visibleActions.map((action, index) => (

                    <button
                        key={index}
                        type="button"
                        className={
                            `data-table-action ${action.cssClass || ""}`
                        }
                        title={
                            action.title ??
                            action.label
                        }
                        onClick={() =>
                            onAction?.(
                                action.action,
                                row
                            )
                        }
                    >
                        <span className="data-table-action-icon">
                            {action.icon}
                        </span>

                        <span className="data-table-action-label">
                            {action.label}
                        </span>
                    </button>

                ))}

            </div>
        );
    };


    /*
     * =========================================================
     * AFFICHAGE
     * =========================================================
     */

    return (
        <div className="data-table">

            <div className="data-table-toolbar">

                <div className="data-table-search-wrapper">

                    <span className="data-table-search-icon">
                        🔎
                    </span>

                    <input
                        className="data-table-search"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />

                    {search && (
                        <button
                            type="button"
                            className="data-table-search-clear"
                            onClick={() => {
                                setSearch("");
                                setPage(1);
                            }}
                        >
                            ×
                        </button>
                    )}

                </div>

                <select
                    className="data-table-page-size"
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                    }}
                >
                    <option value={5}>5 par page</option>
                    <option value={10}>10 par page</option>
                    <option value={25}>25 par page</option>
                    <option value={50}>50 par page</option>
                    <option value={100}>100 par page</option>
                </select>

            </div>


            {/* =================================================
            TABLE UNIQUE
        ================================================= */}

            <div className="data-table-container">

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

                                    <span className="data-table-header-content">
                                        {col.header}

                                        {sort.field === col.field && (
                                            <span
                                                className={
                                                    sort.direction === "asc"
                                                        ? "data-table-sort data-table-sort-asc"
                                                        : "data-table-sort data-table-sort-desc"
                                                }
                                            />
                                        )}
                                    </span>

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
                                        (actions.length > 0 ? 1 : 0)
                                    }
                                    className="data-table-empty"
                                >
                                    <div className="data-table-empty-content">
                                        <span>🔎</span>

                                        <strong>
                                            Aucun résultat
                                        </strong>

                                        <small>
                                            Aucun élément ne correspond à votre recherche.
                                        </small>
                                    </div>
                                </td>

                            </tr>

                        )}


                        {paginatedData.map((row) => (

                            <tr
                                key={row.id}
                                className={
                                    `data-table-row ${dragAndDrop
                                        ? "data-table-row-draggable"
                                        : ""
                                    }`
                                }
                                draggable={dragAndDrop}
                                onDragStart={() =>
                                    handleDragStart(row)
                                }
                                onDragOver={
                                    dragAndDrop
                                        ? handleDragOver
                                        : undefined
                                }
                                onDrop={() =>
                                    handleDrop(row)
                                }
                            >

                                {columns.map((col) => (

                                    <td
                                        key={col.field}
                                        className={
                                            `data-table-cell ${col.type === "date" ||
                                                col.type === "time"
                                                ? "data-table-cell-nowrap"
                                                : ""
                                            } data-table-cell-no-word-break`
                                        } 
                                        data-label={col.header}
                                    >
                                        {renderValue(col, row)}
                                    </td>

                                ))}


                                {actions.length > 0 && (

                                    <td
                                        className="data-table-cell data-table-actions-cell"
                                        data-label="Actions"
                                    >
                                        {renderActions(row)}
                                    </td>

                                )}

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>


            {/* =================================================
            PAGINATION
        ================================================= */}

            {totalPages > 1 && (

                <div className="data-table-pagination">

                    <button
                        type="button"
                        className="data-table-page data-table-page-navigation"
                        disabled={page === 1}
                        onClick={() =>
                            setPage(current => current - 1)
                        }
                    >
                        ‹
                    </button>

                    {Array.from(
                        {
                            length: totalPages
                        },
                        (_, i) => i + 1
                    ).map((p) => (

                        <button
                            key={p}
                            type="button"
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

                    <button
                        type="button"
                        className="data-table-page data-table-page-navigation"
                        disabled={page === totalPages}
                        onClick={() =>
                            setPage(current => current + 1)
                        }
                    >
                        ›
                    </button>

                </div>

            )}

        </div>
    );
}