import { useId, useState } from "react";
import { estUrlPhoto } from "./photoUtils";
import usePhotoLocale from "../../hooks/usePhotoLocale";

/** Variante SVG du même mécanisme de cache ; habillage SVG inchangé. */
export default function SrcPhotoSvg({ url, rayon = 13, children }) {
    const clipId = useId();
    const [failedUrl, setFailedUrl] = useState(null);
    const locale = usePhotoLocale(url);
    const afficherPhoto = estUrlPhoto(url) && locale && failedUrl !== locale;

    if (!afficherPhoto) return <>{children}</>;

    return (
        <>
            <defs>
                <clipPath id={clipId}>
                    <circle cx="0" cy="0" r={rayon} />
                </clipPath>
            </defs>
            <image
                href={locale}
                x={-rayon}
                y={-rayon}
                width={rayon * 2}
                height={rayon * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
                onError={() => setFailedUrl(locale)}
            />
        </>
    );
}
