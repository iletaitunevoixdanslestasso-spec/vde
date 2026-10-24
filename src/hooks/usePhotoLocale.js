import { useEffect, useState } from "react";
import PhotoCacheService, { cheminPhotoSignee } from "../services/PhotoCacheService";

/**
 * Reçoit UNIQUEMENT l'URL de la photo.
 * Pour une URL signée Supabase : retourne une URL locale blob: si possible.
 * Le blob: est libéré automatiquement au démontage / changement de photo.
 */
export default function usePhotoLocale(url) {
    const estSignee = Boolean(cheminPhotoSignee(url));
    const [resultat, setResultat] = useState({ source: null, locale: null });

    useEffect(() => {
        if (!estSignee) return;
        let actif = true;
        let blobUrl = null;

        PhotoCacheService.getBlob(url).then((blob) => {
            if (!actif) return;
            if (blob) blobUrl = URL.createObjectURL(blob);
            setResultat({ source: url, locale: blobUrl || url });
        }).catch(() => {
            if (actif) setResultat({ source: url, locale: url });
        });

        return () => {
            actif = false;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [url, estSignee]);

    // Pendant la lecture du cache, ne pas déclencher un GET <img> concurrent.
    if (!estSignee) return url;
    return resultat.source === url ? resultat.locale : null;
}
