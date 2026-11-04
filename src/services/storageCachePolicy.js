export const STORAGE_CACHE_SECONDS = 12960000;
export const PRIVATE_DAI_CACHE_SECONDS = 3600;

export function categorieStorage(bucket, path) {
    if (bucket === "photos-chanteurs") return "photos_choristes";
    if (bucket === "chanteur-documents" && /(^|\/)droit_image\.pdf$/i.test(path)) return "pdf_dai";
    if (bucket === "referentiel-documents" && path === "droit_image/droit_image.pdf") return "pdf_dai";
    return null;
}

export function versionnerUrl(url, version) {
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(version));
    return parsed.href;
}

export function expirationSignee(url) {
    try {
        const token = new URL(url).searchParams.get("token");
        const segment = token?.split(".")[1];
        if (!segment) return null;
        const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
        return Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}
