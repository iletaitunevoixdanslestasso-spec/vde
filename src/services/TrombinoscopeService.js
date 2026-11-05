import StorageCacheConfigService from "./StorageCacheConfigService";
import SignedUrlCacheService from "./SignedUrlCacheService";
import { scopeTokenChanteur } from "./PhotoCacheService";
import { supabase } from "../core/supabase/client";

/**
 * L'API publique du trombi ne dépend que de la saison.
 * Authentification transmise automatiquement : JWT Supabase s'il existe,
 * sinon token chanteur laissé par TokenGuard.
 */
export default class TrombinoscopeService {
    static async getBySaisonId(saisonId) {
        const cacheGeneration = SignedUrlCacheService.generation;
        if (!saisonId) {
            throw new Error("Saison non renseignée.");
        }

        const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError) {
            throw new Error("Impossible de vérifier la session Supabase.");
        }

        const estAdminConnecte = Boolean(sessionData.session?.access_token);
        const tokenChanteur = estAdminConnecte
            ? null
            : localStorage.getItem("token");

        if (!estAdminConnecte && !tokenChanteur) {
            throw new Error("Aucun accès valide au trombinoscope.");
        }

        const scope = estAdminConnecte
            ? `admin-${sessionData.session.user.id}`
            : await scopeTokenChanteur(tokenChanteur);

        const { data, error } = await supabase.functions.invoke(
            "trombinoscope-saison",
            {
                body: { saisonId },
                headers: tokenChanteur
                    ? { "x-chanteur-token": tokenChanteur }
                    : {}
            }
        );

        if (error) {
            let message = error.message || "Erreur de chargement du trombinoscope.";
            const response = error.context;
            if (response && typeof response.json === "function") {
                try {
                    const detail = await response.json();
                    if (detail?.error) message = detail.error;
                } catch {
                    // Réponse non JSON : conserver le message générique.
                }
            }
            throw new Error(message);
        }

        if (!data?.saison || !Array.isArray(data?.chanteurs)) {
            throw new Error("Réponse du trombinoscope invalide.");
        }

        if (data.storage_cache_config) await StorageCacheConfigService.ingest(data.storage_cache_config);
        if (cacheGeneration !== SignedUrlCacheService.generation) return data;
        return SignedUrlCacheService.reuseUrls(data, scope);
    }
}
