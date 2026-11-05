import { supabase } from "../core/supabase/client";
import StorageCacheConfigService from "./StorageCacheConfigService";
import SignedUrlCacheService from "./SignedUrlCacheService";
import { categorieStorage, expirationSignee, PRIVATE_DAI_CACHE_SECONDS, versionnerUrl } from "./storageCachePolicy";

// Une photo = une clé stable (bucket + chemin du fichier), quel que soit
// le token dans l'URL signée. La version de catégorie invalide les anciennes copies.
const CACHE_NAME = "vde-photos-privees-v2";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PREFIX = "/storage/v1/object/sign/photos-chanteurs/";
const requetesEnCours = new Map();
const cheminsInvalides = new Set();
let generation = 0;
let scopeEnCours = null;
let prochainNettoyage = 0;

export function cheminPhotoSignee(url) {
    if (typeof url !== "string") return null;
    try {
        const parsed = new URL(url);
        // Ne jamais mettre en cache une URL qui imite une URL Supabase.
        if (parsed.origin !== new URL(supabase.supabaseUrl).origin) return null;
        if (!parsed.pathname.startsWith(PREFIX)) return null;
        const path = decodeURIComponent(parsed.pathname.slice(PREFIX.length));
        return path || null;
    } catch {
        return null;
    }
}

export async function scopeTokenChanteur(token) {
    if (!token || !globalThis.crypto?.subtle) return null;
    const empreinte = await crypto.subtle.digest(
        "SHA-256", new TextEncoder().encode(token)
    );
    const hash = Array.from(new Uint8Array(empreinte), b =>
        b.toString(16).padStart(2, "0")
    ).join("");
    return `chanteur-${hash}`;
}

export async function scopeUtilisateur() {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session?.user?.id) {
        return `admin-${data.session.user.id}`;
    }

    // Ne jamais inscrire le token d'accès en clair dans Cache Storage.
    return scopeTokenChanteur(localStorage.getItem("token"));
}

function obtenirScope() {
    // Une seule résolution de session pour les photos chargées simultanément.
    if (!scopeEnCours) {
        scopeEnCours = scopeUtilisateur().finally(() => {
            scopeEnCours = null;
        });
    }
    return scopeEnCours;
}

function cleCache(scope, chemin, categorie, version) {
    return new URL(
        `/__vde_photos__/${encodeURIComponent(scope)}/${categorie}/${version}/${encodeURIComponent(chemin)}`,
        location.origin
    ).href;
}

async function nettoyerCache(cache) {
    if (Date.now() < prochainNettoyage) return;
    prochainNettoyage = Date.now() + 60000;
    const cles = await cache.keys();
    await Promise.all(cles.map(async request => {
        const response = await cache.match(request);
        if (!response) return;
        const path = new URL(request.url).pathname.split("/");
        const date = Number(response.headers.get("X-VDE-Photo-Cached-At"));
        const expire = Number(response.headers.get("X-VDE-Expires-At") || Infinity);
        // Ancien schéma sans version : supprimer seulement les anciennes clés.
        const maxAge = (path[3] === "pdf_dai" ? PRIVATE_DAI_CACHE_SECONDS : 12960000) * 1000;
        if (path.length !== 6 || !date || Date.now() - date >= maxAge || Date.now() >= expire) await cache.delete(request);
    }));
}

async function lireImage(cache, cle, maxAge, mime) {
    const response = await cache.match(cle);
    if (!response) return null;
    const date = Number(response.headers.get("X-VDE-Photo-Cached-At"));
    if (!date || Date.now() - date >= maxAge || Date.now() >= Number(response.headers.get("X-VDE-Expires-At") || Infinity)) {
        await cache.delete(cle);
        return null;
    }
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith(mime)) {
        await cache.delete(cle);
        return null;
    }
    return blob;
}

class PhotoCacheService {
    /**
     * Retourne un Blob quand la photo est disponible localement (ou qu'elle
     * vient d'être téléchargée), sinon null pour utiliser l'URL d'origine.
     * Un appelant doit déjà posséder une URL signée autorisée.
     */
    async getBlob(url, categorie = "photos_choristes") {
        let chemin = cheminPhotoSignee(url);
        let mime = "image/";
        if (categorie === "pdf_dai") {
            try {
                const parsed = new URL(url);
                const prefix = "/storage/v1/object/sign/";
                const segments = decodeURIComponent(parsed.pathname.slice(prefix.length)).split("/");
                const bucket = segments.shift();
                if (parsed.origin !== new URL(supabase.supabaseUrl).origin ||
                    !parsed.pathname.startsWith(prefix) || (bucket !== "referentiel-documents" && categorieStorage(bucket, segments.join("/")) !== "pdf_dai")) return null;
                chemin = `${bucket}/${segments.join("/")}`;
                mime = "application/pdf";
            } catch { return null; }
        } else if (categorie !== "photos_choristes") return null;
        if (!chemin || typeof caches === "undefined") return null;

        const generationDepart = generation;
        const cacheGeneration = SignedUrlCacheService.generation;
        const scope = await obtenirScope();
        if (!scope) return null;

        const config = await StorageCacheConfigService.get(categorie);
        const maxAge = Math.min(config.cache_seconds, categorie === "pdf_dai" ? PRIVATE_DAI_CACHE_SECONDS : Infinity) * 1000;
        const expiresAt = categorie === "pdf_dai" ? Math.min(expirationSignee(url) ?? Date.now() + maxAge, Date.now() + maxAge) : Infinity;
        if (expiresAt <= Date.now()) return null;
        const cle = cleCache(scope, chemin, categorie, config.cache_version);
        let cache;
        try {
            cache = await caches.open(CACHE_NAME);
            await nettoyerCache(cache);
            const image = await lireImage(cache, cle, maxAge, mime);
            if (generationDepart !== generation || cacheGeneration !== SignedUrlCacheService.generation) return null;
            if (image) return image;
        } catch (erreur) {
            console.warn("Cache local des photos indisponible :", erreur);
            return null;
        }

        if (requetesEnCours.has(cle)) return requetesEnCours.get(cle);

        const requete = (async () => {
            try {
                const response = await fetch(versionnerUrl(url, config.cache_version), {
                    mode: "cors",
                    credentials: "omit",
                    cache: cheminsInvalides.has(chemin) ? "reload" : "default"
                });
                if (!response.ok) return null;
                const blob = await response.blob();
                if (!blob.size || !blob.type.startsWith(mime)) return null;
                if (generationDepart !== generation || cacheGeneration !== SignedUrlCacheService.generation) return null;
                cheminsInvalides.delete(chemin);

                if (blob.size <= MAX_IMAGE_BYTES) {
                    try {
                        const cles = await cache.keys();
                        const pathname = new URL(cle).pathname;
                        const prefix = pathname.slice(0, pathname.indexOf(`/${categorie}/`) + categorie.length + 2);
                        const suffix = pathname.split("/").pop();
                        await Promise.all(cles.filter(request => {
                            const ancien = new URL(request.url).pathname;
                            return request.url !== cle && ancien.startsWith(prefix) && ancien.split("/").pop() === suffix;
                        }).map(request => cache.delete(request)));
                        await cache.put(cle, new Response(blob, {
                            headers: {
                                "Content-Type": blob.type,
                                "X-VDE-Photo-Cached-At": String(Date.now()),
                                "X-VDE-Expires-At": String(expiresAt)
                            }
                        }));
                        if (generationDepart !== generation || cacheGeneration !== SignedUrlCacheService.generation) {
                            await cache.delete(cle);
                            return null;
                        }
                    } catch (erreur) {
                        // Quota insuffisant : l'image s'affiche tout de même.
                        console.warn("Enregistrement photo impossible :", erreur);
                    }
                }
                return blob;
            } catch (erreur) {
                // Si fetch/CORS échoue, <img> garde l'URL signée d'origine.
                console.warn("Téléchargement avec cache indisponible :", erreur);
                return null;
            }
        })();

        requetesEnCours.set(cle, requete);
        try {
            return await requete;
        } finally {
            if (requetesEnCours.get(cle) === requete) {
                requetesEnCours.delete(cle);
            }
        }
    }

    async invalidatePath(bucket, path) {
        SignedUrlCacheService.invalidatePath(bucket, path);
        if (typeof caches === "undefined") return;
        generation++;
        requetesEnCours.clear();
        const cache = await caches.open(CACHE_NAME);
        const cles = await cache.keys();
        const chemin = bucket === "photos-chanteurs" ? path : `${bucket}/${path}`;
        cheminsInvalides.add(chemin);
        await Promise.all(cles.filter(request => decodeURIComponent(new URL(request.url).pathname.split("/").pop() || "") === chemin)
            .map(request => cache.delete(request)));
    }

    /** A appeler après une modification de photo (même chemin inclus). */
    async invalidateChanteur(chanteurId) {
        if (!chanteurId) return;
        SignedUrlCacheService.invalidatePrefix("photos-chanteurs", `chanteurs/${chanteurId}/`);
        if (typeof caches === "undefined") return;
        generation++;
        requetesEnCours.clear();
        const cache = await caches.open(CACHE_NAME);
        const cles = await cache.keys();
        const prefix = `chanteurs/${chanteurId}/`;
        await Promise.all(cles.filter((request) => {
            const dernierSegment = new URL(request.url).pathname.split("/").pop();
            const chemin = decodeURIComponent(dernierSegment || "");
            return chemin.startsWith(prefix);
        }).map((request) => cache.delete(request)));
    }

    /** A appeler lors de la déconnexion / du changement de compte. */
    async clearAll() {
        SignedUrlCacheService.clearAll();
        generation++;
        requetesEnCours.clear();
        if (typeof caches !== "undefined") {
            await caches.delete(CACHE_NAME);
        }
    }
}

export default new PhotoCacheService();
