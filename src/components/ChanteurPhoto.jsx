import { useEffect, useState } from "react";
import StorageService from "../services/StorageService";
import AffichePhotoDatatable from "./photos/AffichePhotoDatatable";

const PHOTO_BUCKET = "photos-chanteurs";
const SIGNED_URL_DURATION = 3600;

/**
 * Adaptateur de compatibilité : ne pas changer les appels existants.
 * Admin : path Storage -> URL signée avec StorageService existant.
 * Chanteur : signedUrl déjà fournie par Edge Function.
 */
export default function ChanteurPhoto({
    mode = "admin",
    path = null,
    signedUrl = null,
    alt = "Photo du chanteur",
    width = 56,
    height = 56,
    className = ""
}) {
    const [signed, setSigned] = useState({
        path: null, url: null, loading: false, error: false
    });

    useEffect(() => {
        if (mode !== "admin" || !path) return;

        let active = true;
        StorageService.createSignedUrl(PHOTO_BUCKET, path, SIGNED_URL_DURATION)
            .then((url) => {
                if (active) setSigned({ path, url, loading: false, error: !url });
            })
            .catch((error) => {
                console.error("ChanteurPhoto : erreur URL signée", error);
                if (active) setSigned({ path, url: null, loading: false, error: true });
            });

        return () => { active = false; };
    }, [path, mode]);

    const url = mode === "chanteur"
        ? signedUrl
        : signed.path === path ? signed.url : null;
    const chargement = mode === "admin" && Boolean(path) && signed.path !== path;
    const fallback = chargement
        ? "Chargement…"
        : mode === "admin" && signed.path === path && signed.error
            ? "Photo indisponible"
            : "Aucune photo";

    return (
        <AffichePhotoDatatable
            url={url}
            alt={alt}
            width={width}
            height={height}
            className={className}
            fallback={fallback}
        />
    );
}
