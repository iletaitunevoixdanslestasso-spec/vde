/** Politique pure partagée entre le formulaire React et l'Edge Function Push. */
export const MAX_TITLE_LENGTH = 80;
export const MAX_MESSAGE_BYTES = 1024 * 1024;
export const PUSH_PREVIEW_LENGTH = 160;
// Marge volontaire sous les limites des fournisseurs et de l'enveloppe chiffrée.
export const MAX_PUSH_PAYLOAD_BYTES = 3000;

const encoder = new TextEncoder();
const graphemes = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("fr", { granularity: "grapheme" })
    : null;

/** @param {string} text */
export function messageByteLength(text) {
    return encoder.encode(text).byteLength;
}

/** @param {unknown} titre @param {unknown} message */
export function validerContenuNotification(titre, message) {
    const title = typeof titre === "string" ? titre.trim() : "";
    const content = typeof message === "string" ? message.trim() : "";
    if (!title || title.length > MAX_TITLE_LENGTH) {
        throw new Error(`Le titre doit contenir entre 1 et ${MAX_TITLE_LENGTH} caractères.`);
    }
    if (!content) throw new Error("Le message complet ne peut pas être vide.");
    if (messageByteLength(content) > MAX_MESSAGE_BYTES) {
        throw new Error("Le message complet dépasse la limite de sécurité de 1 Mio.");
    }
    return { titre: title, message: content };
}

/** @param {string} text */
function* segmenter(text) {
    if (graphemes) {
        for (const item of graphemes.segment(text)) yield item.segment;
    } else {
        // Repli pour les anciens navigateurs : préserver au moins les paires UTF-16.
        yield* text;
    }
}

/**
 * Le texte complet n'est jamais modifié ici : seule une nouvelle charge Push
 * est construite. La limite en octets porte sur le JSON, métadonnées comprises.
 * @param {{title: string, body: string, notification_id?: string}} notification
 */
export function creerNotificationPush(notification) {
    const title = notification.title;
    const content = notification.body.replace(/\s+/gu, " ").trim();
    /** @param {string} body */
    const payload = body => ({
        title,
        body,
        ...(notification.notification_id ? { notification_id: notification.notification_id } : {})
    });
    if (messageByteLength(JSON.stringify(payload(""))) > MAX_PUSH_PAYLOAD_BYTES) {
        throw new Error("Le titre et les métadonnées dépassent la taille maximale du Push.");
    }
    const parts = [];
    let coupe = false;
    for (const segment of segmenter(content)) {
        if (parts.length >= PUSH_PREVIEW_LENGTH ||
            messageByteLength(JSON.stringify(payload(parts.join("") + segment))) > MAX_PUSH_PAYLOAD_BYTES) {
            coupe = true;
            break;
        }
        parts.push(segment);
    }
    if (!coupe) return payload(parts.join(""));

    if (parts.length >= PUSH_PREVIEW_LENGTH) parts.pop();
    while (parts.length && messageByteLength(JSON.stringify(payload(parts.join("").trimEnd() + "…"))) > MAX_PUSH_PAYLOAD_BYTES) {
        parts.pop();
    }
    const excerpt = parts.length ? parts.join("").trimEnd() + "…" : "Consultez le message complet dans l’application.";
    if (messageByteLength(JSON.stringify(payload(excerpt))) <= MAX_PUSH_PAYLOAD_BYTES) return payload(excerpt);
    return payload(messageByteLength(JSON.stringify(payload("…"))) <= MAX_PUSH_PAYLOAD_BYTES ? "…" : "");
}

/** @param {{title: string, body: string, notification_id?: string}} notification */
export function serialiserNotificationPush(notification) {
    return JSON.stringify(creerNotificationPush(notification));
}
