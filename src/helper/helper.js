export function formatDate(date) {
    return new Date(date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}
export function formatDateFileName(date) {
    if (!date) return "";

    return date
        .substring(0, 10)
        .replaceAll("-", "_");
}
export function formatDuration(minutes) {
    if (minutes == null || minutes < 0) {
        return "";
    }

    const jours = Math.floor(minutes / (24 * 60));
    const heures = Math.floor((minutes % (24 * 60)) / 60);
    const minutesRestantes = minutes % 60;

    const result = [];

    if (jours > 0) {
        result.push(`${jours}j`);
    }

    if (heures > 0) {
        result.push(`${heures}h`);
    }

    if (minutesRestantes > 0) {
        result.push(`${minutesRestantes}mn`);
    }

    return result.join(" ");
}
export function isPast(date) {

    if (!date) {
        return false;
    }

    const repetitionDate = new Date(date);
    const today = new Date();

    repetitionDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return repetitionDate < today;
}

export function truncateText(value, maxLength = 25) {
    if (!value) return "";

    const text = value.trim();

    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength - 3).trim() + "...";
}
export function truncateTextEnd(value, maxLength = 25) {
    if (!value) return "";

    const text = value.trim();

    if (text.length <= maxLength) {
        return text;
    }

    return "..." + text.slice(-(maxLength - 3)).trimStart();
}

export function getCouleurGroupe(
    groupeId,
    groupeNom
) {

    if (!groupeId && !groupeNom) {
        return "#94a3b8";
    }

    /*
     * La couleur dépend maintenant :
     *
     * - de l'UUID
     * - du nom du groupe
     */
    const cle =
        `${groupeId || ""}|${groupeNom || ""}`
            .trim()
            .toLowerCase();


    /*
     * Hash FNV-1a.
     *
     * Une petite différence dans la clé
     * produit généralement un nombre
     * très différent.
     */
    let hash = 2166136261;

    for (
        let i = 0;
        i < cle.length;
        i++
    ) {

        hash ^=
            cle.charCodeAt(i);

        hash =
            Math.imul(
                hash,
                16777619
            );
    }

    hash >>>= 0;


    /*
     * On mélange encore les bits.
     */
    hash ^= hash >>> 16;

    hash =
        Math.imul(
            hash,
            2246822507
        );

    hash ^= hash >>> 13;

    hash =
        Math.imul(
            hash,
            3266489909
        );

    hash ^= hash >>> 16;

    hash >>>= 0;


    /*
     * COULEUR
     */

    const hue =
        hash % 360;

    const saturation =
        75 +
        (
            (hash >>> 8) %
            11
        );
    // 75 → 85 %

    const lightness =
        40 +
        (
            (hash >>> 16) %
            11
        );
    // 40 → 50 %


    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}


export function openGoogleMaps(lieu) {

    if (!lieu) {
        return;
    }

    const adresse = [
        lieu.nom,
        lieu.rue,
        lieu.code_postale,
        lieu.ville
    ]
        .filter(Boolean)
        .join(", ");

    const url =
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}