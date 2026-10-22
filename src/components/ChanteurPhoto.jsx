import { useEffect, useState } from "react";
import StorageService from "../services/StorageService";

const PHOTO_BUCKET = "photos-chanteurs";
const SIGNED_URL_DURATION = 3600;

/**
 * Affiche le portrait d'un chanteur depuis Supabase Storage (bucket privé).
 *
 * ADMIN : <ChanteurPhoto mode="admin" path={chanteur.photo} />
 *   L'utilisateur connecté obtient une URL signée via StorageService.
 *
 * CHANTEUR : <ChanteurPhoto mode="chanteur" signedUrl={chanteur.photo_url} />
 *   L'URL doit être fournie par une Edge Function ayant validé le token.
 *   Ce composant n'essaie jamais de signer l'URL depuis l'espace chanteur.
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
        path: null,
        url: null,
        loading: false,
        error: false
    });
    const [brokenUrl, setBrokenUrl] = useState(null);

    useEffect(() => {
        if (mode !== "admin") return;

        let active = true;

        if (!path) {
            setSigned({ path: null, url: null, loading: false, error: false });
            return;
        }

        setSigned({ path, url: null, loading: true, error: false });

        StorageService.createSignedUrl(
            PHOTO_BUCKET,
            path,
            SIGNED_URL_DURATION
        ).then((url) => {
            if (!active) return;
            setSigned({
                path,
                url,
                loading: false,
                error: !url
            });
        }).catch((error) => {
            if (!active) return;
            console.error("ChanteurPhoto : erreur URL signée", error);
            setSigned({ path, url: null, loading: false, error: true });
        });

        return () => {
            active = false;
        };
    }, [path, mode]);

    const url = mode === "chanteur"
        ? signedUrl
        : signed.path === path
            ? signed.url
            : null;

    const isLoading = mode === "admin" && Boolean(path) &&
        (signed.path !== path || signed.loading);

    if (!url || brokenUrl === url) {
        const message = isLoading
            ? "Chargement…"
            : (mode === "admin" && signed.error) || brokenUrl === url && Boolean(url)
                ? "Photo indisponible"
                : "Aucune photo";

        return <span className={className}>{message}</span>;
    }

    return (
        <img
            src={url}
            alt={alt}
            title={alt}
            className={className}
            loading="lazy"
            onError={() => setBrokenUrl(url)}
            style={{
                width,
                height,
                maxWidth: "100%",
                objectFit: "cover",
                borderRadius: "8px",
                display: "block"
            }}
        />
    );
}
