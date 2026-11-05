import { useEffect, useRef, useState } from "react";
import { pushAdminService } from "../../../services/PushAdminService";
import "./NotificationsAdminPage.css";
import NotificationHistory from "./NotificationHistory";

export default function NotificationsAdminPage() {
  const [titre, setTitre] = useState("");
  const [message, setMessage] = useState("");
  const [simulation, setSimulation] = useState(null);
  const [confirmation, setConfirmation] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [action, setAction] = useState(null);
  const [destinataires, setDestinataires] = useState(null);
  const [chargementDestinataires, setChargementDestinataires] = useState(true);
  const [erreurDestinataires, setErreurDestinataires] = useState("");
  const [tentativeChargement, setTentativeChargement] = useState(0);
  const [selection, setSelection] = useState([]);
  const envoiId = useRef(null);
  const [actualisationHistorique, setActualisationHistorique] = useState(0);

  useEffect(() => {
    let actif = true;
    pushAdminService.getDestinataires().then(data => {
      if (actif) setDestinataires(data);
    }).catch(e => {
      if (actif) setErreurDestinataires(e instanceof Error ? e.message : "Impossible de charger les destinataires.");
    }).finally(() => {
      if (actif) setChargementDestinataires(false);
    });
    return () => { actif = false; };
  }, [tentativeChargement]);

  const enCours = action !== null;
  const valide = titre.trim().length > 0 && titre.trim().length <= 80 &&
    message.trim().length > 0 && message.trim().length <= 500;
  const chanteurs = destinataires?.chanteurs ?? [];
  const saison = destinataires?.saison;
  const destinatairesValides = !chargementDestinataires && !erreurDestinataires &&
    Boolean(saison?.id) && selection.length > 0;
  const nombreAppareils = simulation?.nombre_appareils ?? 0;
  const nombreSansAbonnement = simulation?.nombre_sans_abonnement ?? 0;
  const peutEnvoyer = Boolean(simulation) && nombreAppareils >= 0 &&
    nombreAppareils <= 200 && confirmation && valide && destinatairesValides && !enCours && !resultat;

  function invaliderSimulation() {
    envoiId.current = null;
    setSimulation(null);
    setConfirmation(false);
    setResultat(null);
    setErreur("");
  }

  function selectionner(ids) {
    setSelection(ids);
    invaliderSimulation();
  }

  function rechargerDestinataires() {
    setChargementDestinataires(true);
    setErreurDestinataires("");
    setDestinataires(null);
    selectionner([]);
    setTentativeChargement(value => value + 1);
  }

  async function simuler(event) {
    event.preventDefault();
    if (!valide || !destinatairesValides || enCours) return;

    setAction("simulation");
    setErreur("");
    setResultat(null);
    setSimulation(null);
    setConfirmation(false);

    try {
      setSimulation(await pushAdminService.simuler(titre, message, selection, saison.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur pendant la simulation.");
    } finally {
      setAction(null);
    }
  }

  async function envoyer() {
    if (!peutEnvoyer) return;

    setAction("envoi");
    setErreur("");
    setConfirmation(false);
    try {
      if (!envoiId.current) envoiId.current = crypto.randomUUID();
      setResultat(await pushAdminService.envoyer(titre, message, selection, saison.id, envoiId.current));
      setSimulation(null); // empêche un second envoi accidentel
    } catch (e) {
      setSimulation(null);
      setErreur(e instanceof Error ? e.message : "Erreur pendant l'envoi.");
    } finally {
      setAction(null);
      setActualisationHistorique(value => value + 1);
    }
  }

  return (
    <section className="notifications-admin">
      <header className="notifications-admin__header">
        <h1>Envoyer une notification</h1>
        <p>
          Choisissez les choristes de la saison active qui retrouveront le message dans leur espace.
          Une notification Push est aussi envoyée à leurs appareils abonnés.
        </p>
      </header>

      <form className="notifications-admin__form" onSubmit={simuler}>
        <fieldset
          className="notifications-admin__recipients"
          disabled={enCours || chargementDestinataires}
          aria-busy={chargementDestinataires}
          aria-describedby="push-destinataires-description"
        >
          <legend>Destinataires de la saison active</legend>
          <p id="push-destinataires-description">
            Aucun choriste n'est sélectionné par défaut. La liste comprend aussi les choristes sans appareil abonné.
          </p>
          {chargementDestinataires && <p role="status">Chargement des destinataires…</p>}
          {erreurDestinataires && (
            <div>
              <p className="notifications-admin__error" role="alert">{erreurDestinataires}</p>
              <button
                type="button"
                className="notifications-admin__button notifications-admin__button--secondary"
                onClick={rechargerDestinataires}
              >
                Réessayer le chargement
              </button>
            </div>
          )}
          {!chargementDestinataires && !erreurDestinataires && !saison && (
            <p role="status">Aucune saison active : l'envoi est indisponible.</p>
          )}
          {!chargementDestinataires && !erreurDestinataires && saison && (
            <>
              <p>Saison active : <strong>{saison.nom}</strong></p>
              {chanteurs.length === 0 ? (
                <p role="status">Aucun choriste inscrit à cette saison : l'envoi est indisponible.</p>
              ) : (
                <>
                  <div className="notifications-admin__selection-actions">
                    <button
                      type="button"
                      className="notifications-admin__button notifications-admin__button--secondary"
                      onClick={() => selectionner(chanteurs.map(chanteur => chanteur.id))}
                      disabled={selection.length === chanteurs.length}
                    >
                      Tout sélectionner
                    </button>
                    <button
                      type="button"
                      className="notifications-admin__button notifications-admin__button--secondary"
                      onClick={() => selectionner([])}
                      disabled={selection.length === 0}
                    >
                      Tout désélectionner
                    </button>
                  </div>
                  <div className="notifications-admin__recipient-list">
                    {chanteurs.map(chanteur => (
                      <label key={chanteur.id} className="notifications-admin__recipient">
                        <input
                          type="checkbox"
                          name="destinataires"
                          value={chanteur.id}
                          checked={selection.includes(chanteur.id)}
                          onChange={event => selectionner(event.target.checked
                            ? [...selection, chanteur.id]
                            : selection.filter(id => id !== chanteur.id))}
                        />
                        <span>{chanteur.nom} {chanteur.prenom}</span>
                      </label>
                    ))}
                  </div>
                  <p className="notifications-admin__selection-count" aria-live="polite">
                    {selection.length} choriste(s) sélectionné(s) sur {chanteurs.length}.
                  </p>
                </>
              )}
            </>
          )}
        </fieldset>

        <div className="notifications-admin__field">
          <label htmlFor="push-titre">Titre de la notification</label>
          <input
            id="push-titre"
            name="titre"
            type="text"
            value={titre}
            maxLength={80}
            placeholder="Ex. : Répétition de jeudi"
            onChange={(event) => {
              setTitre(event.target.value);
              invaliderSimulation();
            }}
            disabled={enCours}
            required
          />
          <small>{titre.length}/80 caractères</small>
        </div>

        <div className="notifications-admin__field">
          <label htmlFor="push-message">Message</label>
          <textarea
            id="push-message"
            name="message"
            value={message}
            maxLength={500}
            rows={5}
            placeholder="Saisis le message à diffuser..."
            onChange={(event) => {
              setMessage(event.target.value);
              invaliderSimulation();
            }}
            disabled={enCours}
            required
          />
          <small>{message.length}/500 caractères</small>
        </div>

        <div className="notifications-admin__preview">
          <strong>Aperçu du contenu</strong>
          <div className="notifications-admin__preview-content">
            <span aria-hidden="true">🔔</span>
            <div>
              <strong>{titre.trim() || "Titre de la notification"}</strong>
              <p>{message.trim() || "Le texte de ta notification apparaîtra ici."}</p>
            </div>
          </div>
        </div>

        <button
          className="notifications-admin__button notifications-admin__button--secondary"
          type="submit"
          disabled={enCours || !valide || !destinatairesValides}
        >
          {action === "simulation" ? "Simulation en cours..." : "1. Simuler l'envoi"}
        </button>
      </form>

      {erreur && <div className="notifications-admin__error" role="alert">{erreur}</div>}

      {simulation && (
        <div className="notifications-admin__result" aria-live="polite">
          <h2>Résultat de la simulation</h2>
          <p>
            <strong>{selection.length}</strong> choriste(s) sélectionné(s),
            <strong> {nombreAppareils}</strong> appareil(s) destinataire(s).
            Aucune notification n'a été envoyée.
          </p>

          {nombreSansAbonnement > 0 && (
            <p className="notifications-admin__warning">
              {nombreSansAbonnement} choriste(s) sélectionné(s) n'ont aucun appareil abonné. Ils retrouveront le message dans leur espace, sans alerte Push.
            </p>
          )}
          {nombreAppareils === 0 && (
            <p className="notifications-admin__warning">Aucun appareil abonné pour cette sélection : le message sera disponible dans l'espace des choristes, sans alerte Push.</p>
          )}

          {nombreAppareils > 200 && (
            <p className="notifications-admin__warning">
              Plus de 200 abonnements : l'envoi est bloqué par la limite actuelle de la fonction.
            </p>
          )}

          {nombreAppareils >= 0 && nombreAppareils <= 200 && (
            <>
              <label className="notifications-admin__confirmation">
                <input
                  type="checkbox"
                  checked={confirmation}
                  disabled={enCours}
                  onChange={(event) => setConfirmation(event.target.checked)}
                />
                Je confirme la publication pour les {selection.length} choristes sélectionnés et l'alerte Push sur {nombreAppareils} appareils.
              </label>
              <button
                type="button"
                className="notifications-admin__button notifications-admin__button--primary"
                onClick={envoyer}
                disabled={!peutEnvoyer}
              >
                {action === "envoi" ? "Envoi en cours..." : "2. Publier le message"}
              </button>
            </>
          )}
        </div>
      )}

      {resultat && (
        <div className="notifications-admin__result" aria-live="polite">
          <h2>Message publié</h2>
          <p>
            Choristes sélectionnés : <strong>{selection.length}</strong>
            {" · "}Appareils ciblés : <strong>{resultat.nombre_appareils ?? 0}</strong>
            {" · "}Acceptés par les services Push : <strong>{resultat.acceptes ?? 0}</strong>
            {" · "}Échecs : <strong>{resultat.echecs ?? 0}</strong>
          </p>
          <p>
            {resultat.message || "L'envoi a été traité."}
          </p>
          <p className="notifications-admin__note">
            « Accepté » ne garantit pas l'affichage effectif sur l'appareil.
          </p>
          <button
            type="button"
            className="notifications-admin__button notifications-admin__button--secondary"
            onClick={() => {
              setTitre("");
              setMessage("");
              selectionner([]);
            }}
          >
            Rédiger une autre notification
          </button>
        </div>
      )}
      <NotificationHistory key={actualisationHistorique} />
    </section>
  );
}
