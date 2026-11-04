import { useState } from "react";
import PhotoCacheService from "../services/PhotoCacheService";

/** Chargement à la demande, dans le cache privé existant (au plus une heure). */
export default function PdfDaiLink({ href, children, ...props }) {
    const [loading, setLoading] = useState(false);
    async function ouvrir(event) {
        if (!href || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (loading) return;
        const fenetre = window.open("about:blank", "_blank");
        if (!fenetre) return;
        fenetre.opener = null;
        setLoading(true);
        try {
            const blob = await PhotoCacheService.getBlob(href, "pdf_dai");
            if (fenetre.closed) return;
            if (blob) {
                const url = URL.createObjectURL(blob);
                fenetre.location.replace(url);
                // Laisser le temps au lecteur PDF de charger le document.
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } else {
                fenetre.location.replace(href);
            }
        } catch {
            if (!fenetre.closed) fenetre.location.replace(href);
        } finally {
            setLoading(false);
        }
    }
    return <a {...props} href={href} target="_blank" rel="noopener noreferrer" onClick={ouvrir} aria-busy={loading}>{children}</a>;
}
