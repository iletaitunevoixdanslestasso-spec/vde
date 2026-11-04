import { supabase } from "../core/supabase/client";

const CONFIG_TTL_MS = 60_000;
const CACHE_SECONDS = 12_960_000;
const CODES = ["photos_choristes", "pdf_dai"];

function defaults() {
    return CODES.map(code => ({ code, cache_version: 1, cache_seconds: CACHE_SECONDS, updated_at: null }));
}

function normalize(rows) {
    if (!Array.isArray(rows)) throw new Error("Configuration du cache invalide.");
    return CODES.map(code => {
        const row = rows.find(value => value?.code === code);
        if (!row || !Number.isSafeInteger(row.cache_version) || row.cache_version < 1 ||
            !Number.isSafeInteger(row.cache_seconds) || row.cache_seconds < 1) {
            throw new Error("Configuration du cache incomplète.");
        }
        return { code, cache_version: row.cache_version, cache_seconds: row.cache_seconds, updated_at: row.updated_at ?? null };
    });
}

function latestRows(previous, incoming) {
    return incoming.map(row => {
        const current = previous?.find(value => value.code === row.code);
        return current && current.cache_version > row.cache_version ? current : row;
    });
}

async function identity() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Impossible de vérifier la session.");
    if (data?.session?.user?.id) return { scope: `admin-${data.session.user.id}`, token: null, authenticated: true };
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentification nécessaire pour charger le cache.");
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const scope = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
    return { scope: `chanteur-${scope}`, token, authenticated: false };
}

async function invoke(body) {
    const { data, error } = await supabase.functions.invoke("storage-cache-config", { body });
    if (error) {
        let message = "Impossible de charger la configuration du cache.";
        if (typeof error.context?.json === "function") {
            try {
                const detail = await error.context.json();
                if (typeof detail?.error === "string") message = detail.error;
            } catch { /* Réponse non JSON : conserver le message générique. */ }
        }
        throw new Error(message);
    }
    return data;
}

async function readConfig(actor) {
    // Les sessions Auth disposent déjà de SELECT via les RLS. La fonction
    // n'est nécessaire en lecture que pour valider les tokens chanteurs.
    if (!actor.authenticated) return invoke({ token: actor.token });
    const { data, error } = await supabase.from("storage_cache_config")
        .select("code, cache_version, cache_seconds, updated_at")
        .in("code", CODES);
    if (error) throw error;
    return { config: data };
}

class StorageCacheConfigService {
    entries = new Map();
    pending = new Map();
    canRefresh = false;
    currentScope = null;

    async load({ force = false, strict = false } = {}) {
        try {
            const actor = await identity();
            this.currentScope = actor.scope;
            const cached = this.entries.get(actor.scope);
            this.canRefresh = cached?.canRefresh === true;
            if (!force && cached && cached.expires > Date.now()) {
                if (strict && cached.error) throw cached.error;
                return cached.rows;
            }
            let request = this.pending.get(actor.scope);
            if (!request) {
                request = readConfig(actor).then(data => {
                    const rows = latestRows(this.entries.get(actor.scope)?.rows, normalize(data?.config));
                    const entry = {
                        rows,
                        expires: Date.now() + CONFIG_TTL_MS,
                        canRefresh: actor.authenticated
                            ? this.entries.get(actor.scope)?.canRefresh === true
                            : data.can_refresh === true
                    };
                    this.entries.set(actor.scope, entry);
                    return entry;
                }).catch(error => {
                    const entry = { rows: this.entries.get(actor.scope)?.rows ?? cached?.rows ?? defaults(), expires: Date.now() + CONFIG_TTL_MS, canRefresh: false, error };
                    this.entries.set(actor.scope, entry);
                    return entry;
                }).finally(() => this.pending.delete(actor.scope));
                this.pending.set(actor.scope, request);
            }
            const entry = await request;
            if (this.currentScope === actor.scope) this.canRefresh = entry.canRefresh;
            if (strict && entry.error) throw entry.error;
            return entry.rows;
        } catch (error) {
            if (strict) throw error;
            this.canRefresh = false;
            return defaults();
        }
    }

    async get(code) {
        if (!CODES.includes(code)) throw new Error("Catégorie de cache inconnue.");
        return (await this.load()).find(row => row.code === code);
    }

    // Réservé à l'écran d'administration : ne pas faire dépendre la lecture
    // des métadonnées de la disponibilité du service d'invalidation.
    async checkRefreshPermission() {
        const actor = await identity();
        this.currentScope = actor.scope;
        this.canRefresh = false;
        const cached = this.entries.get(actor.scope);
        if (cached) cached.canRefresh = false;
        if (!actor.authenticated) return false;
        const data = await invoke({ action: "read" });
        const allowed = data?.can_refresh === true;
        if (this.currentScope === actor.scope) this.canRefresh = allowed;
        const entry = this.entries.get(actor.scope);
        if (entry) entry.canRefresh = allowed;
        return allowed;
    }

    // Les fonctions qui ont déjà validé l'accès peuvent fournir les mêmes lignes.
    async ingest(rows) {
        if (!rows) return null;
        const normalized = normalize(rows);
        const actor = await identity();
        const cached = this.entries.get(actor.scope);
        this.entries.set(actor.scope, {
            rows: latestRows(cached?.rows, normalized),
            expires: Date.now() + CONFIG_TTL_MS,
            canRefresh: cached?.canRefresh === true
        });
        return normalized;
    }

    async refresh(code) {
        if (!CODES.includes(code)) throw new Error("Catégorie de cache inconnue.");
        const actor = await identity();
        if (!actor.authenticated) throw new Error("Droits administrateur nécessaires.");
        const data = await invoke({ action: "refresh", code });
        const rows = latestRows(this.entries.get(actor.scope)?.rows, normalize(data?.config));
        this.entries.set(actor.scope, { rows, expires: Date.now() + CONFIG_TTL_MS, canRefresh: data.can_refresh === true });
        this.currentScope = actor.scope;
        this.canRefresh = data.can_refresh === true;
        return rows;
    }
}

export default new StorageCacheConfigService();
