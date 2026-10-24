import { supabase } from "../core/supabase/client";

// Une photo = une clé stable (bucket + chemin du fichier), quel que soit
// le token dans l'URL signée. Les images restent dans le navigateur 24 h.
const CACHE_NAME = "vde-photos-privees-v2";
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PREFIX = "/storage/v1/object/sign/photos-chanteurs/";
const requetesEnCours = new Map();
let generation = 0;
let scopeEnCours = null;

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

async function scopeUtilisateur() {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session?.user?.id) {
        return `admin-${data.session.user.id}`;
    }

    const token = localStorage.getItem("token");
    if (!token || !globalThis.crypto?.subtle) return null;

    // Ne jamais inscrire le token d'accès en clair dans Cache Storage.
    const empreinte = await crypto.subtle.digest(
        "SHA-256", new TextEncoder().encode(token)
    );
    const hash = Array.from(new Uint8Array(empreinte), b =>
        b.toString(16).padStart(2, "0")
    ).join("");
    return `chanteur-${hash}`;
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

function cleCache(scope, chemin) {
    return new URL(
        `/__vde_photos__/${encodeURIComponent(scope)}/${encodeURIComponent(chemin)}`,
        location.origin
    ).href;
}

async function lireImage(cache, cle) {
    const response = await cache.match(cle);
    if (!response) return null;
    const date = Number(response.headers.get("X-VDE-Photo-Cached-At"));
    if (!date || Date.now() - date >= MAX_AGE) {
        await cache.delete(cle);
        return null;
    }
    const blob = await response.blob();
    if (!blob.size || !blob.type.startsWith("image/")) {
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
    async getBlob(url) {
        const chemin = cheminPhotoSignee(url);
        if (!chemin || typeof caches === "undefined") return null;

        const scope = await obtenirScope();
        if (!scope) return null;

        const cle = cleCache(scope, chemin);
        let cache;
        try {
            cache = await caches.open(CACHE_NAME);
            const image = await lireImage(cache, cle);
            if (image) return image;
        } catch (erreur) {
            console.warn("Cache local des photos indisponible :", erreur);
            return null;
        }

        if (requetesEnCours.has(cle)) return requetesEnCours.get(cle);

        const generationDepart = generation;
        const requete = (async () => {
            try {
                const response = await fetch(url, {
                    mode: "cors",
                    credentials: "omit"
                });
                if (!response.ok) return null;
                const blob = await response.blob();
                if (!blob.size || !blob.type.startsWith("image/")) return null;
                if (generationDepart !== generation) return null;

                if (blob.size <= MAX_IMAGE_BYTES) {
                    try {
                        await cache.put(cle, new Response(blob, {
                            headers: {
                                "Content-Type": blob.type,
                                "X-VDE-Photo-Cached-At": String(Date.now())
                            }
                        }));
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

    /** A appeler après une modification de photo (même chemin inclus). */
    async invalidateChanteur(chanteurId) {
        if (!chanteurId || typeof caches === "undefined") return;
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
        generation++;
        requetesEnCours.clear();
        if (typeof caches !== "undefined") {
            await caches.delete(CACHE_NAME);
        }
    }
}

export default new PhotoCacheService();
