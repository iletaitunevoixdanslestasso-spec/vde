import { useId, useState } from "react";

/**
 * Variante SVG de l'avatar : destinée aux plans de chœur (zoomables).
 * Ne récupère pas la photo elle-même : photoUrl est une URL signée
 * transmise par RepresentationChoeur via StorageService.
 */
export default function AvatarChanteurSvg({
    photoUrl = null,
    couleurPupitre = "#64748b",
    couleurGroupe = "#64748b"
}) {
    const clipId = useId();
    const [failedUrl, setFailedUrl] = useState(null);

    const afficherPhoto =
        typeof photoUrl === "string" &&
        /^https:\/\//i.test(photoUrl) &&
        failedUrl !== photoUrl;

    return (
        <g className="svg-chanteur-avatar">
            {/* Médaillon intérieur derrière l'image ou la silhouette. */}
            <circle cx="0" cy="0" r="13" fill="#f8fafc" />

            {afficherPhoto ? (
                <>
                    <defs>
                        <clipPath id={clipId}>
                            <circle cx="0" cy="0" r="13" />
                        </clipPath>
                    </defs>
                    <image
                        href={photoUrl}
                        x="-13"
                        y="-13"
                        width="26"
                        height="26"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${clipId})`}
                        onError={() => setFailedUrl(photoUrl)}
                    />
                </>
            ) : (
                <>
                    {/* Silhouette de remplacement si aucune photo n'est disponible. */}
                    <circle
                        cx="0"
                        cy="-5"
                        r="4.5"
                        fill={couleurGroupe}
                    />
                    <path
                        d="M-9 10 C-9 3 -5 0 0 0 C5 0 9 3 9 10"
                        fill={couleurGroupe}
                    />
                </>
            )}

            {/* Anneau intérieur : groupe. */}
            <circle
                cx="0"
                cy="0"
                r="15"
                fill="none"
                stroke={couleurGroupe}
                strokeWidth="2.5"
            />

            {/* Anneau extérieur : pupitre. */}
            <circle
                cx="0"
                cy="0"
                r="18.5"
                fill="none"
                stroke={couleurPupitre}
                strokeWidth="3"
            />
        </g>
    );
}
