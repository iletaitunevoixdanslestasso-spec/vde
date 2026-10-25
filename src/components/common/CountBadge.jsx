import "./CountBadge.css";

/**
 * Compteur réutilisable (admin et espace chanteur).
 * Le pluriel peut être fourni pour les mots irréguliers.
 */
export default function CountBadge({
    count,
    singular = "élément",
    plural,
    className = ""
}) {
    if (count === null || count === undefined) {
        return null;
    }

    // 0 et tout nombre différent de 1 prennent le pluriel.
    // Le pluriel explicite reste prioritaire pour les exceptions françaises.
    const pluralLabel = plural ??
        (/[sxz]$/i.test(singular) ? singular : `${singular}s`);
    const label = Number(count) === 1 ? singular : pluralLabel;

    return (
        <div className={["count-badge", className].filter(Boolean).join(" ")}>
            <strong>{count}</strong>
            <span>{label}</span>
        </div>
    );
}
