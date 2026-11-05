import { supabase } from "../core/supabase/client";
import { expirationSignee } from "./storageCachePolicy";

const STORAGE_KEY = "vde-signed-download-urls-v1";
const MAX_ENTRIES = 500;
const EXPIRY_MARGIN_MS = 30_000;
const DOWNLOAD_PREFIXES = ["/storage/v1/object/sign/", "/storage/v1/render/image/sign/"];

function describe(url) {
    if (typeof url !== "string") return null;
    try {
        const parsed = new URL(url);
        const prefix = DOWNLOAD_PREFIXES.find(value => parsed.pathname.startsWith(value));
        if (!prefix || parsed.origin !== new URL(supabase.supabaseUrl).origin ||
            parsed.username || parsed.password || parsed.searchParams.getAll("token").length !== 1) return null;
        const token = parsed.searchParams.get("token");
        if (token.split(".").length !== 3 || token.split(".").some(value => !value)) return null;
        const expiresAt = expirationSignee(url);
        if (!Number.isFinite(expiresAt)) return null;
        const object = decodeURIComponent(parsed.pathname.slice(prefix.length));
        if (!object.includes("/") || object.endsWith("/")) return null;
        const query = new URLSearchParams(parsed.search);
        query.delete("token");
        query.sort();
        return {
            identity: JSON.stringify([parsed.origin, parsed.pathname, query.toString()]),
            object,
            expiresAt
        };
    } catch {
        return null;
    }
}

function validEntry(entry) {
    const details = describe(entry?.url);
    if (!details || !Number.isFinite(entry.expiresAt)) return null;
    const expiresAt = Math.min(entry.expiresAt, details.expiresAt);
    return expiresAt > Date.now() + EXPIRY_MARGIN_MS ? { url: entry.url, expiresAt } : null;
}

class SignedUrlCacheService {
    entries = new Map();
    #generation = 0;

    get generation() {
        return this.#generation;
    }

    constructor() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
            if (saved?.version !== 1 || !Array.isArray(saved.entries)) return;
            for (const pair of saved.entries.slice(-MAX_ENTRIES)) {
                if (!Array.isArray(pair) || typeof pair[0] !== "string" || !pair[0]) continue;
                const entry = validEntry(pair[1]);
                if (entry) this.entries.set(pair[0], entry);
            }
        } catch {
            // Le stockage peut être bloqué, saturé ou avoir un ancien contenu.
            // La réutilisation en mémoire reste disponible dans tous ces cas.
        }
    }

    persist() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries: [...this.entries] }));
        } catch {
            // Éviter de restaurer après rechargement une ancienne copie devenue
            // invalide quand une écriture échoue (quota du navigateur, etc.).
            try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Stockage indisponible. */ }
        }
    }

    get(key) {
        const saved = this.entries.get(key);
        if (!saved) return null;
        const entry = validEntry(saved);
        if (!entry) {
            this.entries.delete(key);
            this.persist();
            return null;
        }
        // Le demandeur ne doit pas pouvoir prolonger une entrée par mutation.
        return { ...entry };
    }

    store(key, url, expiresAt = Infinity) {
        if (typeof key !== "string" || !key || typeof expiresAt !== "number" || Number.isNaN(expiresAt)) return false;
        const details = describe(url);
        const entry = details && validEntry({ url, expiresAt: Math.min(expiresAt, details.expiresAt) });
        if (!entry) return false;
        for (const [oldKey, oldEntry] of this.entries) {
            if (oldEntry.expiresAt <= Date.now() + EXPIRY_MARGIN_MS) this.entries.delete(oldKey);
        }
        this.entries.delete(key);
        this.entries.set(key, entry);
        while (this.entries.size > MAX_ENTRIES) this.entries.delete(this.entries.keys().next().value);
        return true;
    }

    set(key, url, expiresAt = Infinity) {
        if (this.store(key, url, expiresAt)) this.persist();
    }

    // Les fonctions métier ont déjà contrôlé l'accès avant de fournir la réponse.
    // On conserve seulement les liens de téléchargement, séparés par identité,
    // pour réutiliser leur token exact pendant sa durée de validité restante.
    reuseUrls(value, scope) {
        let changed = false;
        const visit = current => {
            if (typeof current === "string" && typeof scope === "string" && scope) {
                const details = describe(current);
                if (!details || details.expiresAt <= Date.now() + EXPIRY_MARGIN_MS) return current;
                const key = JSON.stringify(["download-url", scope, details.identity]);
                const cached = this.get(key);
                if (cached && cached.expiresAt <= details.expiresAt &&
                    describe(cached.url)?.identity === details.identity) return cached.url;
                changed = this.store(key, current, details.expiresAt) || changed;
                return current;
            }
            if (Array.isArray(current)) return current.map(visit);
            if (current && typeof current === "object") {
                return Object.fromEntries(Object.entries(current).map(([key, item]) => [key, visit(item)]));
            }
            return current;
        };
        const result = visit(value);
        if (changed) this.persist();
        return result;
    }

    invalidatePath(bucket, path) {
        this.#generation++;
        this.invalidateMatching(object => object === `${bucket}/${path}`);
    }

    invalidatePrefix(bucket, pathPrefix) {
        this.#generation++;
        this.invalidateMatching(object => object.startsWith(`${bucket}/${pathPrefix}`));
    }

    invalidateMatching(matches) {
        let changed = false;
        for (const [key, entry] of this.entries) {
            const details = describe(entry.url);
            if (!details || matches(details.object)) {
                this.entries.delete(key);
                changed = true;
            }
        }
        if (changed) this.persist();
    }

    clearAll() {
        this.#generation++;
        this.entries.clear();
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Stockage indisponible. */ }
    }
}

export default new SignedUrlCacheService();
