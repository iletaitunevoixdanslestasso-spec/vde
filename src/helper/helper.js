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