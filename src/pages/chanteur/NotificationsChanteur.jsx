import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, Mail, MailOpen } from "lucide-react";
import EspaceChanteurPageHeader from "../../components/EspaceChanteurPageHeader";
import { notificationMessageService } from "../../services/NotificationMessageService";
import { formatMessageDate } from "../../helper/helper";
import "../../styles/espaceChanteur_notifications.css";

const TAILLE_PAGE = 20;

function BoiteNotifications({ token }) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [etat, setEtat] = useState({
    messages: [], total: 0, non_lus: 0, loading: true, erreur: ""
  });
  const [messageOuvert, setMessageOuvert] = useState(null);
  const [enregistrement, setEnregistrement] = useState(null);
  const [erreurLecture, setErreurLecture] = useState("");
  const actif = useRef(true);
  const generation = useRef(0);
  const mutationEnCours = useRef(false);

  useEffect(() => {
    actif.current = true;
    return () => { actif.current = false; };
  }, []);

  useEffect(() => {
    let courant = true;
    const requete = ++generation.current;

    async function charger() {
      try {
        const resultat = await notificationMessageService.lister(token, page, TAILLE_PAGE);
        if (courant && requete === generation.current) {
          setEtat({ ...resultat, loading: false, erreur: "" });
        }
      } catch (erreur) {
        if (courant && requete === generation.current) {
          setEtat((precedent) => ({
            ...precedent,
            loading: false,
            erreur: erreur.message || "Impossible de charger vos notifications."
          }));
        }
      }
    }

    charger();
    return () => { courant = false; };
  }, [token, page, revision]);

  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState !== "visible") return;
      if (mutationEnCours.current) return;
      generation.current += 1;
      setRevision((precedente) => precedente + 1);
    };

    window.addEventListener("focus", auRetour);
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.removeEventListener("focus", auRetour);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, []);

  function chargerPage(nouvellePage) {
    generation.current += 1;
    setEtat((precedent) => ({ ...precedent, loading: true, erreur: "" }));
    setMessageOuvert(null);
    setErreurLecture("");
    setPage(nouvellePage);
    setRevision((precedente) => precedente + 1);
  }

  async function definirLecture(message, lu) {
    if (mutationEnCours.current) return;
    mutationEnCours.current = true;
    // Une liste en cours ne doit pas écraser la confirmation de cette lecture.
    generation.current += 1;
    setEnregistrement(message.id);
    setErreurLecture("");

    try {
      const resultat = await notificationMessageService.definirLecture(token, message.id, lu);
      if (!actif.current) return;
      setEtat((precedent) => ({
        ...precedent,
        non_lus: resultat.non_lus,
        messages: precedent.messages.map((item) => item.id === message.id
          ? { ...item, lu_le: resultat.lu_le }
          : item)
      }));
    } catch (erreur) {
      if (actif.current) {
        setErreurLecture(erreur.message || "Impossible de modifier l'état de lecture. Réessayez.");
      }
    } finally {
      mutationEnCours.current = false;
      if (actif.current) {
        setEnregistrement(null);
        setRevision((precedente) => precedente + 1);
      }
    }
  }

  function ouvrirMessage(message) {
    setMessageOuvert(messageOuvert === message.id ? null : message.id);
  }

  const nombrePages = Math.max(1, Math.ceil(etat.total / TAILLE_PAGE));
  const bloque = etat.loading || Boolean(enregistrement);

  return (
    <div className="notifications-chanteur">
      <EspaceChanteurPageHeader
        title="Mes notifications"
        subtitle="Les messages de votre chorale, à retrouver à tout moment."
        iconClass="icon-notification-on"
        count={etat.loading ? null : etat.total}
        singular="notification"
        plural="notifications"
      />

      <div className="notifications-chanteur-toolbar">
        <p className="notifications-chanteur-summary" aria-live="polite">
          {!etat.loading && !etat.erreur && (
            etat.non_lus > 0
              ? `${etat.non_lus} notification${etat.non_lus > 1 ? "s" : ""} non lue${etat.non_lus > 1 ? "s" : ""}`
              : "Toutes vos notifications ont été lues."
          )}
        </p>
        <button
          type="button"
          className="notifications-chanteur-button"
          disabled={bloque}
          onClick={() => chargerPage(page)}
        >
          Actualiser
        </button>
      </div>

      {etat.loading ? (
        <p className="notifications-chanteur-status" role="status">Chargement des notifications…</p>
      ) : etat.erreur ? (
        <div className="notifications-chanteur-error" role="alert">
          <p>{etat.erreur}</p>
          <button type="button" className="notifications-chanteur-button" onClick={() => chargerPage(page)}>
            Réessayer
          </button>
        </div>
      ) : etat.messages.length === 0 ? (
        <p className="notifications-chanteur-status">Vous n'avez pas encore reçu de notification.</p>
      ) : (
        <>
          {erreurLecture && <p className="notifications-chanteur-error" role="alert">{erreurLecture}</p>}
          <ul className="notifications-chanteur-list">
            {etat.messages.map((message) => {
              const ouvert = messageOuvert === message.id;
              const lu = Boolean(message.lu_le);
              const enCours = enregistrement === message.id;

              return (
                <li key={message.id}>
                  <article
                    className={`notifications-chanteur-message ${lu ? "" : "notifications-chanteur-message--non-lu"}`.trim()}
                    aria-busy={enCours}
                  >
                    <div className="notifications-chanteur-message-heading">
                      <h2 className="notifications-chanteur-title">{message.titre}</h2>
                      <button
                        type="button"
                        className={`notifications-chanteur-chevron ${ouvert ? "notifications-chanteur-chevron--ouvert" : ""}`.trim()}
                        aria-label={`${ouvert ? "Réduire" : "Afficher"} le message : ${message.titre}`}
                        title={ouvert ? "Réduire le message" : "Afficher le message"}
                        aria-expanded={ouvert}
                        aria-controls={`notification-contenu-${message.id}`}
                        onClick={() => ouvrirMessage(message)}
                      >
                        <ChevronDown size={22} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`notifications-chanteur-read-state ${lu ? "notifications-chanteur-read-state--lu" : ""}`.trim()}
                        aria-label={`État de lecture : ${message.titre}`}
                        aria-pressed={lu}
                        title={lu ? "Marquer comme non lu" : "Marquer comme lu"}
                        disabled={Boolean(enregistrement)}
                        onClick={() => definirLecture(message, !lu)}
                      >
                        {lu ? <MailOpen size={17} aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}
                        <span>{lu ? "Lu" : "Non lu"}</span>
                      </button>
                    </div>
                    <p className="notifications-chanteur-meta">
                      <span>{message.auteur_nom || "Auteur non renseigné"}</span>
                      <time dateTime={message.created_at}>{formatMessageDate(message.created_at)}</time>
                    </p>
                    <p
                      id={`notification-contenu-${message.id}`}
                      className={`notifications-chanteur-content ${ouvert ? "" : "notifications-chanteur-content--preview"}`.trim()}
                    >
                      {message.contenu}
                    </p>
                  </article>
                </li>
              );
            })}
          </ul>

          {nombrePages > 1 && (
            <nav className="notifications-chanteur-pagination" aria-label="Pages des notifications">
              <button type="button" className="notifications-chanteur-button" disabled={bloque || page === 0} onClick={() => chargerPage(page - 1)}>
                Précédent
              </button>
              <span>Page {page + 1} sur {nombrePages}</span>
              <button type="button" className="notifications-chanteur-button" disabled={bloque || page + 1 >= nombrePages} onClick={() => chargerPage(page + 1)}>
                Suivant
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default function NotificationsChanteur() {
  const { token } = useParams();
  // Le changement de lien personnel réinitialise immédiatement toutes les données.
  return <BoiteNotifications key={token} token={token} />;
}
