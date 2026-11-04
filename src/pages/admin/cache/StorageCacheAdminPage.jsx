import { useEffect, useState } from "react";
import StorageCacheConfigService from "../../../services/StorageCacheConfigService";
import "./StorageCacheAdminPage.css";

const CATEGORIES = [
    { code: "photos_choristes", label: "Photos des choristes" },
    { code: "pdf_dai", label: "PDF DAI" }
];

async function readConfiguration() {
    const rows = await StorageCacheConfigService.load({ force: true, strict: true });
    try {
        const canRefresh = await StorageCacheConfigService.checkRefreshPermission();
        return { rows, canRefresh, permissionError: "" };
    } catch {
        return {
            rows,
            canRefresh: false,
            permissionError: "La configuration est disponible, mais le service d’actualisation du cache est indisponible."
        };
    }
}

export default function StorageCacheAdminPage() {
    const [rows, setRows] = useState([]);
    const [canRefresh, setCanRefresh] = useState(false);
    const [busy, setBusy] = useState(true);
    const [confirmation, setConfirmation] = useState(null);
    const [error, setError] = useState("");
    const [permissionError, setPermissionError] = useState("");
    const [message, setMessage] = useState("");

    async function load() {
        setBusy(true);
        setError("");
        setPermissionError("");
        try {
            const config = await readConfiguration();
            setRows(config.rows);
            setCanRefresh(config.canRefresh);
            setPermissionError(config.permissionError);
        } catch (cause) {
            setCanRefresh(false);
            setError(cause instanceof Error ? cause.message : "Chargement impossible.");
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        let active = true;
        readConfiguration().then(config => {
            if (!active) return;
            setRows(config.rows);
            setCanRefresh(config.canRefresh);
            setPermissionError(config.permissionError);
        }).catch(cause => {
            if (active) setError(cause instanceof Error ? cause.message : "Chargement impossible.");
        }).finally(() => {
            if (active) setBusy(false);
        });
        return () => { active = false; };
    }, []);

    async function refresh(code) {
        setBusy(true);
        setError("");
        setMessage("");
        try {
            setRows(await StorageCacheConfigService.refresh(code));
            setCanRefresh(StorageCacheConfigService.canRefresh);
            setMessage("La version a été actualisée. Les autres sessions prendront le changement en compte au prochain chargement de leur configuration.");
            setConfirmation(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Actualisation impossible.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="storage-cache-admin" aria-busy={busy}>
            <h1>Cache des fichiers</h1>
            <p>Actualiser une catégorie demande aux navigateurs de récupérer sa nouvelle version au prochain accès.</p>
            <p>Les fichiers restent privés. Un document déjà téléchargé ne peut pas être révoqué à distance.</p>
            {error && <p role="alert">{error}</p>}
            {permissionError && <p role="alert">{permissionError}</p>}
            {message && <p role="status">{message}</p>}
            <button type="button" onClick={load} disabled={busy}>Relire la configuration</button>
            {!busy && !error && !permissionError && !canRefresh && <p>Ce compte n'est pas autorisé à actualiser les caches.</p>}
            {CATEGORIES.map(category => {
                const row = rows.find(value => value.code === category.code);
                return (
                    <article key={category.code}>
                        <h2>{category.label}</h2>
                        <p>Version : {row?.cache_version ?? "—"} · Cache Storage : {row ? `${row.cache_seconds / 86400} jours` : "—"}</p>
                        {category.code === "pdf_dai" && <p>Par confidentialité, la copie locale des PDF reste limitée à une heure et à la validité de son URL signée.</p>}
                        {canRefresh && (confirmation === category.code ? (
                            <div>
                                <p>Confirmer l'actualisation de cette catégorie pour tous les appareils ?</p>
                                <button type="button" onClick={() => refresh(category.code)} disabled={busy}>Confirmer pour {category.label}</button>
                                <button type="button" onClick={() => setConfirmation(null)} disabled={busy}>Annuler</button>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setConfirmation(category.code)} disabled={busy}>Actualiser le cache {category.label}</button>
                        ))}
                    </article>
                );
            })}
        </section>
    );
}
