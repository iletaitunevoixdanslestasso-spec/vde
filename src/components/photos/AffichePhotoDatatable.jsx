import SrcPhoto from "./SrcPhoto";

/** Présentation prévue pour les colonnes des DataTables d'administration. */
export default function AffichePhotoDatatable({
    url,
    alt = "Photo du chanteur",
    width = 56,
    height = 56,
    className = "",
    fallback = "Aucune photo",
    failedFallback = "Photo indisponible"
}) {
    return (
        <SrcPhoto
            url={url}
            alt={alt}
            fallback={fallback}
            failedFallback={failedFallback}
            imageClassName={className}
            fallbackClassName={className}
            imageStyle={{
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
