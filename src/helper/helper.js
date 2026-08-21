export function formatDate(date) {
    return new Date(date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
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