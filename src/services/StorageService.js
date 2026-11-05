import { supabase } from "../core/supabase/client";
import StorageCacheConfigService from "./StorageCacheConfigService";
import SignedUrlCacheService from "./SignedUrlCacheService";
import PhotoCacheService, { scopeUtilisateur, scopeTokenChanteur } from "./PhotoCacheService";
import { categorieStorage, expirationSignee, STORAGE_CACHE_SECONDS, versionnerUrl } from "./storageCachePolicy";

const appelsEnCours = new Map();
let generationSignatures = 0;
let authUserId = null;

supabase.auth.onAuthStateChange((event, session) => {
    const nextId = session?.user?.id ?? null;
    const changeCompte = authUserId !== null && authUserId !== nextId;
    authUserId = nextId;
    if (event === "SIGNED_OUT" || changeCompte) {
        generationSignatures++;
        appelsEnCours.clear();
        void PhotoCacheService.clearAll().catch(() => {});
    }
});


const sanitizeFileName = (fileName) => {
    return fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
};

class StorageService {

    async upload(bucket, path, file, cacheCategory = null) {

        const parts = path.split("/");
        const fileName = parts.pop();

        const safeFileName = sanitizeFileName(fileName);

        const safePath = [
            ...parts,
            safeFileName
        ].join("/");

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(safePath, file, {
                upsert: true,
                ...(cacheCategory || categorieStorage(bucket, safePath) ? { cacheControl: String(STORAGE_CACHE_SECONDS) } : {}),
            });

        if (error) {
            throw error;
        }

        await this.invalidateFile(bucket, safePath);
        return data;
    }

    async invalidateFile(bucket, path) {
        generationSignatures++;
        appelsEnCours.clear();
        try { await PhotoCacheService.invalidatePath(bucket, path); } catch { /* Cache facultatif. */ }
    }

    async remove(bucket, path) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            throw error;
        }

        await this.invalidateFile(bucket, path);
        return data;
    }

    async createSignedUrl_old(bucket, path, expiresIn = 3600) {
        return this.createSignedUrl(bucket, path, expiresIn);
    }
    async createSignedUrl(bucket, path, expiresIn = 3600, cacheCategory = null) {
        try {
            const cleanPath =
                typeof path === "string"
                    ? path
                    : path?.path;

            if (!cleanPath) {
                console.error("StorageService.createSignedUrl : path invalide", path);
                return null;
            }

            const generationDepart = generationSignatures;
            const cacheGeneration = SignedUrlCacheService.generation;
            const category = cacheCategory || categorieStorage(bucket, cleanPath);
            const config = category ? await StorageCacheConfigService.get(category) : null;
            const scope = await scopeUtilisateur();
            if (generationDepart !== generationSignatures || cacheGeneration !== SignedUrlCacheService.generation) return null;
            const key = scope ? JSON.stringify([scope, bucket, cleanPath, expiresIn, config?.cache_version ?? null]) : null;
            const persisted = key && SignedUrlCacheService.get(key);
            if (persisted) return persisted.url;
            if (key && appelsEnCours.has(key)) return appelsEnCours.get(key);
            const creation = (async () => {
                const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, expiresIn);
                if (error) throw error;
                const signedUrl = data?.signedUrl ? config ? versionnerUrl(data.signedUrl, config.cache_version) : data.signedUrl : null;
                if (generationDepart !== generationSignatures || cacheGeneration !== SignedUrlCacheService.generation) return null;
                const url = SignedUrlCacheService.reuseUrls(signedUrl, scope);
                if (url && key) {
                    const expiresAt = Math.min(Date.now() + expiresIn * 1000, expirationSignee(url) ?? Infinity);
                    SignedUrlCacheService.set(key, url, expiresAt);
                }
                return url;
            })();
            if (key) appelsEnCours.set(key, creation);
            try { return await creation; } finally { if (key && appelsEnCours.get(key) === creation) appelsEnCours.delete(key); }

        } catch (error) {
            console.error(
                "Erreur inattendue createSignedUrl :",
                error
            );

            return null;
        }
    }
    async createSignedUploadUrl(bucket, path) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUploadUrl(path, {
                upsert: true
            });

        if (error) {
            throw error;
        }

        return data;
    }

    async uploadToSignedUrl_old(bucket, path, token, file) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .uploadToSignedUrl(
                path,
                token,
                file,
                {
                    contentType: file.type
                }
            );

        if (error) {
            throw error;
        }

        return data;
    }

    async uploadToSignedUrl(bucket, path, token, file) {
        const cleanPath =
            typeof path === "string"
                ? path
                : path?.path;

        if (!cleanPath) {
            throw new Error(
                `uploadToSignedUrl : path invalide : ${JSON.stringify(path)}`
            );
        }

        if (!token) {
            throw new Error("uploadToSignedUrl : token manquant");
        }

        if (!file) {
            throw new Error("uploadToSignedUrl : fichier manquant");
        }

        const { data, error } = await supabase.storage
            .from(bucket)
            .uploadToSignedUrl(
                cleanPath,
                token,
                file,
                { contentType: file.type, ...(categorieStorage(bucket, cleanPath) ? { cacheControl: String(STORAGE_CACHE_SECONDS) } : {}) }
            );

        if (error) {
            throw error;
        }

        await this.invalidateFile(bucket, cleanPath);
        return data;
    }

    async createChanteurDroitImageUpload_old(token) {
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-chanteur-droit-image-upload`,
            {
                method: "POST",
                headers: {
                    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Impossible d'obtenir l'autorisation d'upload."
            );
        }

        return result;
    }
    async createChanteurDroitImageUpload(token) {

        return await this.callChanteurFunction(
            "create-chanteur-droit-image-upload",
            token
        );
    }

    async getChanteurDocuments(token) {

        return await this.callChanteurFunction(
            "get-chanteur-documents",
            token
        );
    }

    async callChanteurFunction(functionName, token, body = {}) {
        const cacheGeneration = SignedUrlCacheService.generation;
        const scope = await scopeTokenChanteur(token);
        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
            {
                method: "POST",
                headers: {
                    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token,
                    ...body
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                `Erreur lors de l'appel à ${functionName}.`
            );
        }

        if (result.storage_cache_config) await StorageCacheConfigService.ingest(result.storage_cache_config);
        if (cacheGeneration !== SignedUrlCacheService.generation) return result;
        return SignedUrlCacheService.reuseUrls(result, scope);
    }

    async getDroitImageUrl(token, functionName) {
        const generationDepart = generationSignatures;
        const cacheGeneration = SignedUrlCacheService.generation;
        const config = await StorageCacheConfigService.get("pdf_dai");
        // Le profil métier reste distinct même si un administrateur est connecté.
        const scope = await scopeTokenChanteur(token);
        if (generationDepart !== generationSignatures || cacheGeneration !== SignedUrlCacheService.generation) return null;
        const key = scope ? JSON.stringify([scope, functionName, config.cache_version]) : null;
        if (key && appelsEnCours.has(key)) return appelsEnCours.get(key);
        const creation = (async () => {
            // Relire la réponse autorisée pour détecter un DAI remplacé ou un
            // droit modifié ; callChanteurFunction réutilise seulement son URL.
            const result = await this.callChanteurFunction(functionName, token);
            const url = result?.url;
            if (generationDepart !== generationSignatures || cacheGeneration !== SignedUrlCacheService.generation) return null;
            return url ?? null;
        })();
        if (key) appelsEnCours.set(key, creation);
        try { return await creation; } finally { if (key && appelsEnCours.get(key) === creation) appelsEnCours.delete(key); }
    }

    async getChansonParoles(token, chansonId) {

        const result = await this.callChanteurFunction(
            "get-chanteur-chanson-paroles",
            token,
            {
                chansonId
            }
        );

        return result?.data || null;
    }
    // Espace chanteur (sans session Supabase Auth) :
    // le token est validé par l'Edge Function, qui renvoie les URL signées.
    async getTrombinoscope(token) {
        const result = await this.callChanteurFunction(
            "get-trombinoscope",
            token
        );

        const chanteurs = result?.chanteurs ?? result?.data ?? [];

        if (!Array.isArray(chanteurs)) {
            throw new Error("Réponse incorrecte de get-trombinoscope.");
        }

        return chanteurs;
    }

    // Détail du trombinoscope depuis la même Edge Function que les avatars.
    // Récupère en un appel les URL signées, les groupes et la saison.
    async getTrombinoscopeDetails(token) {
        const result = await this.callChanteurFunction(
            "get-trombinoscope", token
        );
        if (!Array.isArray(result?.chanteurs)) {
            throw new Error("Réponse incorrecte du trombinoscope.");
        }
        return {
            chanteurs: result.chanteurs,
            groupes: result.groupes ?? [],
            saison: result.saison ?? null,
            chef: result.chef ?? null
        };
    }

    // Récupère une URL signée pour la photo du chanteur connecté.
    // L'accès anonyme est autorisé par la validation du token dans l'Edge Function.
    async getPhotoProfil(token, chanteurId) {
        if (!token || !chanteurId) return null;

        const chanteurs = await this.getTrombinoscope(token);
        const fiche = chanteurs.find((c) => c.id === chanteurId);
        const url = fiche?.photo_url;

        // Ne jamais utiliser un chemin privé du bucket comme URL publique.
        return typeof url === "string" && /^https:\/\//i.test(url)
            ? url
            : null;
    }

}

export default new StorageService();
