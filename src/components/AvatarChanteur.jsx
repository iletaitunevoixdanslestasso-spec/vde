import { useEffect, useState } from "react";
import StorageService from "../services/StorageService";
import AffichePhotoProfil from "./photos/AffichePhotoProfil";
import "./AvatarChanteur.css";

/**
 * Adaptateur de compatibilité pour les pages EXISTANTES.
 * - photoUrl fourni : URL signée déjà prête, aucune requête.
 * - token + chanteurId : ancien mécanisme getPhotoProfil, inchangé.
 * Les nouveaux écrans utilisent AffichePhotoProfil(url) directement.
 */
export default function AvatarChanteur({
    token,
    chanteurId,
    photoUrl: photoUrlExterne,
    className = "",
    size = 64,
    fallback = "👤",
    alt = "Photo de profil"
}) {
    const [photo, setPhoto] = useState({ key: null, url: null });
    const key = `${token ?? ""}:${chanteurId ?? ""}`;

    useEffect(() => {
        if (photoUrlExterne !== undefined || !token || !chanteurId) return;

        let active = true;
        StorageService.getPhotoProfil(token, chanteurId)
            .then((url) => {
                if (active) setPhoto({ key, url });
            })
            .catch((error) => {
                console.warn("Photo du chanteur indisponible :", error);
                if (active) setPhoto({ key, url: null });
            });

        return () => { active = false; };
    }, [token, chanteurId, key, photoUrlExterne]);

    const url = photoUrlExterne !== undefined
        ? photoUrlExterne
        : photo.key === key ? photo.url : null;

    return (
        <AffichePhotoProfil
            url={url}
            size={size}
            fallback={fallback}
            alt={alt}
            className={className}
        />
    );
}
