import { useEffect, useState } from "react";
import { notificationMessageService } from "../../../services/NotificationMessageService";
import { formatMessageDate } from "../../../helper/helper";
import "./NotificationHistory.css";

const PAGE_SIZE = 20;
const STATUTS = {
    en_cours: "Bilan Push à vérifier",
    termine: "Traitement Push terminé",
    partiel: "Traitement Push partiel",
    erreur: "Échec du traitement Push"
};

export default function NotificationHistory() {
    const [page, setPage] = useState(0);
    const [tentative, setTentative] = useState(0);
    const [state, setState] = useState({ messages: [], total: 0, loading: true, error: "" });
    useEffect(() => {
        let active = true;
        notificationMessageService.listerAdmin(page, PAGE_SIZE).then(result => {
            if (active) setState({ ...result, loading: false, error: "" });
        }).catch(cause => {
            if (active) setState(previous => ({ ...previous, loading: false, error: cause.message || "Chargement impossible." }));
        });
        return () => { active = false; };
    }, [page, tentative]);

    function changerPage(value) {
        setState(previous => ({ ...previous, loading: true, error: "" }));
        setPage(value);
    }
    function actualiser() {
        setState(previous => ({ ...previous, loading: true, error: "" }));
        setPage(0);
        setTentative(value => value + 1);
    }

    return (
        <section className="notifications-admin-history" aria-label="Historique des messages" aria-busy={state.loading}>
            <header className="notifications-admin-history__header">
                <h2>Historique des messages</h2>
                <button type="button" onClick={actualiser} disabled={state.loading}>Actualiser</button>
            </header>
            <p>Les messages publiés sont conservés ici. Les simulations ne sont pas enregistrées.</p>
            {state.loading && <p role="status">Chargement de l'historique…</p>}
            {state.error && <p role="alert">{state.error}</p>}
            {!state.loading && !state.error && state.messages.length === 0 && <p>Aucun message enregistré pour le moment.</p>}
            {!state.error && state.messages.map(message => (
                <article className="notifications-admin-history__message" key={message.id}>
                    <h3>{message.titre}</h3>
                    <p className="notifications-admin-history__meta">
                        Par {message.auteur_nom || "Administration"} · <time dateTime={message.created_at}>{formatMessageDate(message.created_at)}</time>
                    </p>
                    <p className="notifications-admin-history__content">{message.contenu}</p>
                    <p>{message.nombre_chanteurs} destinataire(s) · {message.nombre_appareils} appareil(s) Push</p>
                    <p>{STATUTS[message.statut_push] || "Bilan Push indisponible"} · {message.acceptes} accepté(s) · {message.echecs} échec(s)</p>
                </article>
            ))}
            {state.total > PAGE_SIZE && (
                <nav className="notifications-admin-history__pagination" aria-label="Pagination de l'historique">
                    <button type="button" onClick={() => changerPage(page - 1)} disabled={state.loading || page === 0}>Précédent</button>
                    <span>Page {page + 1} sur {Math.max(1, Math.ceil(state.total / PAGE_SIZE))}</span>
                    <button type="button" onClick={() => changerPage(page + 1)} disabled={state.loading || (page + 1) * PAGE_SIZE >= state.total}>Suivant</button>
                </nav>
            )}
        </section>
    );
}
