import { useState } from "react";
import { estUrlPhoto } from "./photoUtils";
import usePhotoLocale from "../../hooks/usePhotoLocale";

/**
 * Photo HTML : une URL en entrée, mise en cache centralisée.
 * Les composants de présentation (trombi, datatable, profil) ne changent pas.
 */
export default function SrcPhoto({
    url,
    alt = "",
    fallback = "👤",
    failedFallback = "Photo indisponible",
    imageClassName = "",
    fallbackClassName = "",
    imageStyle,
    loading = "lazy"
}) {
    const [failedUrl, setFailedUrl] = useState(null);
    const locale = usePhotoLocale(url);
    const valide = estUrlPhoto(url);
    const enErreur = valide && failedUrl === locale && Boolean(locale);

    if (!valide || !locale || enErreur) {
        return (
            <span className={fallbackClassName}>
                {enErreur ? failedFallback : fallback}
            </span>
        );
    }

    return (
        <img
            src={locale}
            alt={alt}
            className={imageClassName}
            style={imageStyle}
            loading={loading}
            onError={() => setFailedUrl(locale)}
        />
    );
}
