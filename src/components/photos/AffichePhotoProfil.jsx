import SrcPhoto from "./SrcPhoto";
import "../AvatarChanteur.css";

/** Présentation d'un portrait rond, réutilisée par dashboard, profil et invités. */
export default function AffichePhotoProfil({
    url,
    size = 64,
    fallback = "👤",
    alt = "Photo de profil",
    className = ""
}) {
    return (
        <div
            className={`chanteur-avatar ${className}`.trim()}
            style={{ "--chanteur-avatar-size": `${size}px` }}
            role="img"
            aria-label={alt}
        >
            <SrcPhoto
                url={url}
                alt=""
                fallback={fallback}
                failedFallback={fallback}
                imageClassName="chanteur-avatar__image"
                fallbackClassName="chanteur-avatar__fallback"
            />
        </div>
    );
}
