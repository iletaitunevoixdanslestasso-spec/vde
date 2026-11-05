import { supabase } from "../core/supabase/client";
import { expirationSignee } from "./storageCachePolicy";

const STORAGE_KEY = "vde-signed-download-urls-v2";
const EPOCH_KEY = "vde-signed-download-urls-epoch-v1";
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
    #epoch = "";
    #dirty = new Map();
    #blockedEpoch = null;
    #decodedRaw;
    #decodedEpoch;
    #decodedEntries = new Map();

    get generation() {
        this.sync();
        return this.#generation;
    }

    constructor() {
        this.sync();
    }

    decode(raw, epoch) {
        if (raw === this.#decodedRaw && epoch === this.#decodedEpoch) {
            return new Map([...this.#decodedEntries].filter(([, entry]) => entry.expiresAt > Date.now() + EXPIRY_MARGIN_MS));
        }
        const entries = new Map();
        try {
            const saved = JSON.parse(raw || "null");
            if (saved?.version === 2 && saved.epoch === epoch && Array.isArray(saved.entries)) {
                for (const pair of saved.entries.slice(-MAX_ENTRIES)) {
                    if (!Array.isArray(pair) || typeof pair[0] !== "string" || !pair[0]) continue;
                    const entry = validEntry(pair[1]);
                    if (entry) entries.set(pair[0], entry);
                }
            }
        } catch { /* Ancien contenu ou stockage modifié : ne rien restaurer. */ }
        this.#decodedRaw = raw;
        this.#decodedEpoch = epoch;
        this.#decodedEntries = new Map(entries);
        return entries;
    }

    sync() {
        try {
            // Relire à chaque opération : les autres onglets peuvent ajouter des
            // liens ou invalider une requête pendant que celui-ci est ouvert.
            const epoch = localStorage.getItem(EPOCH_KEY) || "";
            const raw = localStorage.getItem(STORAGE_KEY);
            const observedEpoch = localStorage.getItem(EPOCH_KEY) || "";
            if (observedEpoch !== epoch) {
                // Une invalidation a réellement été observée pendant la lecture.
                // Un repli mémoire ne doit pas renvoyer les anciennes signatures.
                this.discardForEpoch(observedEpoch);
                return false;
            }
            if (this.#blockedEpoch !== null && epoch === this.#blockedEpoch) return false;
            this.#blockedEpoch = null;
            if (epoch !== this.#epoch) {
                this.#epoch = epoch;
                this.#generation++;
                this.#dirty.clear();
            }
            const latest = this.decode(raw, epoch);
            for (const [key, entry] of this.#dirty) {
                if (entry.expiresAt > Date.now() + EXPIRY_MARGIN_MS) latest.set(key, entry);
                else this.#dirty.delete(key);
            }
            this.entries = latest;
            this.trim();
            return true;
        } catch {
            // Le stockage peut être bloqué, saturé ou avoir un ancien contenu.
            // La réutilisation en mémoire reste disponible dans tous ces cas.
            return false;
        }
    }

    discardForEpoch(epoch) {
        this.#epoch = epoch;
        this.#generation++;
        this.#dirty.clear();
        this.entries.clear();
        this.#blockedEpoch = null;
    }

    trim() {
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= Date.now() + EXPIRY_MARGIN_MS) {
                this.entries.delete(key);
                this.#dirty.delete(key);
            }
        }
        while (this.entries.size > MAX_ENTRIES) {
            const key = this.entries.keys().next().value;
            this.entries.delete(key);
            this.#dirty.delete(key);
        }
    }

    persist(epoch) {
        try {
            if (this.#blockedEpoch !== null) return;
            let observedEpoch = localStorage.getItem(EPOCH_KEY) || "";
            if (observedEpoch !== epoch) {
                this.discardForEpoch(observedEpoch);
                this.sync();
                return;
            }
            const latest = this.decode(localStorage.getItem(STORAGE_KEY), epoch);
            for (const [key, entry] of this.#dirty) {
                if (entry.expiresAt > Date.now() + EXPIRY_MARGIN_MS) latest.set(key, entry);
            }
            // Une écriture courante ne change jamais la barrière d'invalidation.
            // Si un autre onglet invalide entre les deux accès, ce document garde
            // l'ancien epoch et sera ignoré, même si son écriture finit après.
            observedEpoch = localStorage.getItem(EPOCH_KEY) || "";
            if (observedEpoch !== epoch) {
                this.discardForEpoch(observedEpoch);
                this.sync();
                return;
            }
            this.entries = latest;
            this.trim();
            const raw = JSON.stringify({ version: 2, epoch, entries: [...this.entries] });
            localStorage.setItem(STORAGE_KEY, raw);
            this.#decodedRaw = raw;
            this.#decodedEpoch = epoch;
            this.#decodedEntries = new Map(this.entries);
            observedEpoch = localStorage.getItem(EPOCH_KEY) || "";
            if (observedEpoch !== epoch) {
                this.discardForEpoch(observedEpoch);
                this.sync();
                return;
            }
            this.#dirty.clear();
        } catch {
            // Garder les ajouts en mémoire si le navigateur refuse la persistance.
        }
    }

    read(key) {
        const saved = this.entries.get(key);
        if (!saved) return null;
        const entry = validEntry(saved);
        if (!entry) {
            this.entries.delete(key);
            this.#dirty.delete(key);
            return null;
        }
        // Le demandeur ne doit pas pouvoir prolonger une entrée par mutation.
        return { ...entry };
    }

    get(key) {
        this.sync();
        return this.read(key);
    }

    store(key, url, expiresAt = Infinity) {
        if (typeof key !== "string" || !key || typeof expiresAt !== "number" || Number.isNaN(expiresAt)) return false;
        const details = describe(url);
        const entry = details && validEntry({ url, expiresAt: Math.min(expiresAt, details.expiresAt) });
        if (!entry) return false;
        this.entries.delete(key);
        this.entries.set(key, entry);
        this.#dirty.set(key, entry);
        this.trim();
        return true;
    }

    set(key, url, expiresAt = Infinity, expectedGeneration) {
        this.sync();
        if (expectedGeneration !== undefined && expectedGeneration !== this.#generation) return;
        const epoch = this.#epoch;
        if (this.store(key, url, expiresAt)) this.persist(epoch);
    }

    // Les fonctions métier ont déjà contrôlé l'accès avant de fournir la réponse.
    // On conserve seulement les liens de téléchargement, séparés par identité,
    // pour réutiliser leur token exact pendant sa durée de validité restante.
    reuseUrls(value, scope, expectedGeneration) {
        this.sync();
        const epoch = this.#epoch;
        const canReuse = expectedGeneration === undefined || expectedGeneration === this.#generation;
        let changed = false;
        const visit = current => {
            if (canReuse && typeof current === "string" && typeof scope === "string" && scope) {
                const details = describe(current);
                if (!details || details.expiresAt <= Date.now() + EXPIRY_MARGIN_MS) return current;
                const key = JSON.stringify(["download-url", scope, details.identity]);
                const cached = this.read(key);
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
        if (changed) this.persist(epoch);
        return result;
    }

    invalidatePath(bucket, path) {
        this.invalidateMatching(object => object === `${bucket}/${path}`);
    }

    invalidatePrefix(bucket, pathPrefix) {
        this.invalidateMatching(object => object.startsWith(`${bucket}/${pathPrefix}`));
    }

    invalidateMatching(matches) {
        this.sync();
        for (const [key, entry] of this.entries) {
            const details = describe(entry.url);
            if (!details || matches(details.object)) {
                this.entries.delete(key);
            }
        }
        this.#dirty = new Map(this.entries);
        this.advanceEpoch();
        this.persist(this.#epoch);
    }

    advanceEpoch() {
        let blockedEpoch = this.#blockedEpoch ?? this.#epoch;
        try {
            const observedEpoch = localStorage.getItem(EPOCH_KEY) || "";
            if (observedEpoch !== blockedEpoch) {
                // Un autre onglet a invalidé depuis notre instantané. Ne jamais
                // republier les entrées conservées avant sa purge sous un epoch neuf.
                this.entries.clear();
                this.#dirty.clear();
                blockedEpoch = observedEpoch;
            }
        } catch { /* Conserver le repli mémoire si le stockage est bloqué. */ }
        this.#epoch = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        this.#generation++;
        try {
            localStorage.setItem(EPOCH_KEY, this.#epoch);
            this.#blockedEpoch = null;
        } catch {
            // Sans barrière persistée, conserver l'invalidation locale et ne pas
            // réimporter les anciennes entrées lors de la prochaine lecture.
            this.#blockedEpoch = blockedEpoch;
            try { localStorage.removeItem(STORAGE_KEY); } catch { /* Stockage indisponible. */ }
        }
    }

    clearAll() {
        this.sync();
        this.entries.clear();
        this.#dirty.clear();
        this.advanceEpoch();
        // Conserver l'epoch : même sans aucune entrée, il rejette les réponses
        // commencées dans un autre onglet avant la déconnexion/invalidation.
        try {
            if ((localStorage.getItem(EPOCH_KEY) || "") === this.#epoch) localStorage.removeItem(STORAGE_KEY);
        } catch { /* Stockage indisponible. */ }
    }
}

export default new SignedUrlCacheService();
