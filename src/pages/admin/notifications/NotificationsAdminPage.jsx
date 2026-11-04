import { useState } from "react";
import { pushAdminService } from "../../../services/PushAdminService";
import "./NotificationsAdminPage.css";

export default function NotificationsAdminPage() {
  const [titre, setTitre] = useState("");
  const [message, setMessage] = useState("");
  const [simulation, setSimulation] = useState(null);
  const [confirmation, setConfirmation] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState("");
  const [action, setAction] = useState(null);

  const enCours = action !== null;
  const valide = titre.trim().length > 0 && titre.trim().length <= 80 &&
    message.trim().length > 0 && message.trim().length <= 500;
  const nombreAppareils = simulation?.nombre_appareils ?? 0;
  const peutEnvoyer = Boolean(simulation) && nombreAppareils > 0 &&
    nombreAppareils <= 200 && confirmation && valide && !enCours && !resultat;

  function invaliderSimulation() {
    setSimulation(null);
    setConfirmation(false);
    setResultat(null);
    setErreur("");
  }

  async function simuler(event) {
    event.preventDefault();
    if (!valide || enCours) return;

    setAction("simulation");
    setErreur("");
    setResultat(null);
    setSimulation(null);
    setConfirmation(false);

    try {
      setSimulation(await pushAdminService.simuler(titre, message));
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
      setResultat(await pushAdminService.envoyer(titre, message));
      setSimulation(null); // empêche un second envoi accidentel
    } catch (e) {
      setSimulation(null);
      setErreur(e instanceof Error ? e.message : "Erreur pendant l'envoi.");
    } finally {
      setAction(null);
    }
  }

  return (
    <section className="notifications-admin">
      <header className="notifications-admin__header">
        <h1>Envoyer une notification</h1>
        <p>
          Diffusion à tous les appareils inscrits aux notifications Push,
          sans distinction de saison. Un chanteur peut avoir plusieurs appareils.
        </p>
      </header>

      <form className="notifications-admin__form" onSubmit={simuler}>
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
          disabled={enCours || !valide}
        >
          {action === "simulation" ? "Simulation en cours..." : "1. Simuler l'envoi"}
        </button>
      </form>

      {erreur && <div className="notifications-admin__error" role="alert">{erreur}</div>}

      {simulation && (
        <div className="notifications-admin__result" aria-live="polite">
          <h2>Résultat de la simulation</h2>
          <p>
            <strong>{nombreAppareils}</strong> appareil(s) destinataire(s).
            Aucune notification n'a été envoyée.
          </p>

          {nombreAppareils > 200 && (
            <p className="notifications-admin__warning">
              Plus de 200 abonnements : l'envoi est bloqué par la limite actuelle de la fonction.
            </p>
          )}

          {nombreAppareils > 0 && nombreAppareils <= 200 && (
            <>
              <label className="notifications-admin__confirmation">
                <input
                  type="checkbox"
                  checked={confirmation}
                  disabled={enCours}
                  onChange={(event) => setConfirmation(event.target.checked)}
                />
                Je confirme l'envoi de ce message aux {nombreAppareils} appareils.
              </label>
              <button
                type="button"
                className="notifications-admin__button notifications-admin__button--primary"
                onClick={envoyer}
                disabled={!peutEnvoyer}
              >
                {action === "envoi" ? "Envoi en cours..." : "2. Envoyer la notification"}
              </button>
            </>
          )}
        </div>
      )}

      {resultat && (
        <div className="notifications-admin__result" aria-live="polite">
          <h2>Envoi terminé</h2>
          <p>
            Appareils ciblés : <strong>{resultat.nombre_appareils ?? 0}</strong>
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
              invaliderSimulation();
            }}
          >
            Rédiger une autre notification
          </button>
        </div>
      )}
    </section>
  );
}
