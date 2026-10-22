import { useEffect, useState } from "react";
import StorageService from "../services/StorageService";
import "./AvatarChanteur.css";

/**
 * Avatar réutilisable dans l'espace chanteur.
 * La photo provient d'une URL signée renvoyée par get-trombinoscope
 * via StorageService, avec authentification par token d'accès.
 */
export default function AvatarChanteur({
    token,
    chanteurId,
    className = "",
    size = 64,
    fallback = "👤",
    alt = "Photo de profil"
}) {
    const [photo, setPhoto] = useState({ key: null, url: null });
    const [failedUrl, setFailedUrl] = useState(null);

    // La clé empêche d'afficher la photo d'un autre chanteur
    // pendant le chargement après un changement d'identité.
    const key = `${token ?? ""}:${chanteurId ?? ""}`;

    useEffect(() => {
        if (!token || !chanteurId) return;

        let cancelled = false;

        StorageService.getPhotoProfil(token, chanteurId)
            .then((url) => {
                if (!cancelled) setPhoto({ key, url });
            })
            .catch((error) => {
                console.warn("Photo du chanteur indisponible :", error);
                if (!cancelled) setPhoto({ key, url: null });
            });

        return () => {
            cancelled = true;
        };
    }, [token, chanteurId, key]);

    const photoUrl = photo.key === key ? photo.url : null;
    const showPhoto = Boolean(photoUrl) && failedUrl !== photoUrl;

    return (
        <div
            className={`chanteur-avatar ${className}`.trim()}
            style={{ "--chanteur-avatar-size": `${size}px` }}
            role="img"
            aria-label={showPhoto ? alt : "Avatar par défaut"}
        >
            {showPhoto ? (
                <img
                    className="chanteur-avatar__image"
                    src={photoUrl}
                    alt=""
                    onError={() => setFailedUrl(photoUrl)}
                />
            ) : (
                <span className="chanteur-avatar__fallback" aria-hidden="true">
                    {fallback}
                </span>
            )}
        </div>
    );
}
