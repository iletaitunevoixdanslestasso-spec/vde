
import { useEffect, useState } from "react";

// Accepte un lien Drive ou un identifiant
export function getGoogleDriveId(value) {
    if (!value) return null;

    const input = value.trim();
    const isValidId = /^[a-zA-Z0-9_-]{10,}$/;

    if (isValidId.test(input)) {
        return input;
    }

    try {
        const url = new URL(input);

        if (url.hostname !== "drive.google.com") {
            return null;
        }

        const match = url.pathname.match(
            /\/file\/d\/([^/]+)/
        );

        const id = match?.[1] ||
            url.searchParams.get("id");

        return id && isValidId.test(id)
            ? id
            : null;

    } catch {
        return null;
    }
}

export default function GoogleDriveImage({
    fileUrl,
    alt = "Image",
    width = 400,
    className = ""
}) {
    const [error, setError] = useState(false);

    const fileId = getGoogleDriveId(fileUrl);

    useEffect(() => {
        setError(false);
    }, [fileUrl]);

    if (!fileId) {
        return null;
    }

    const imageUrl =
        `https://drive.google.com/thumbnail` +
        `?id=${encodeURIComponent(fileId)}` +
        `&sz=w1600`;

    const originalUrl =
        fileUrl?.startsWith("https://drive.google.com/")
            ? fileUrl
            : `https://drive.google.com/file/d/${fileId}/view`;

    if (error) {
        return (
            <a
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
            >
                Voir l'image sur Google Drive
            </a>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={alt}
            title={alt}
            className={className}
            loading="lazy"
            onError={() => setError(true)}
            style={{
                maxWidth: "100%",
                width,
                height: "auto",
                objectFit: "contain"
            }}
        />
    );
}
