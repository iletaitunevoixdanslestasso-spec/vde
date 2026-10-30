import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { pushSubscriptionService } from "../../services/PushSubscriptionService";
import "./NotificationPermission.css";

function lirePermission() {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported";
}

export default function NotificationPermission() {
  const [permission, setPermission] = useState(lirePermission);
  const [demandeEnCours, setDemandeEnCours] = useState(false);
  const [etatAbonnement, setEtatAbonnement] = useState("non_verifie");
  const [erreur, setErreur] = useState("");

  // Actualise l'affichage si l'autorisation change dans les réglages.
  useEffect(() => {
    const actualiser = () => setPermission(lirePermission());
    window.addEventListener("focus", actualiser);
    return () => window.removeEventListener("focus", actualiser);
  }, []);

  const estIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const estInstallee =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const doitEtreInstallee = estIOS && !estInstallee;
  const estCompatible =
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  // Si les notifications sont déjà autorisées, vérifie si cet appareil
  // possède un abonnement Push ; le cas échéant, le synchronise avec Supabase.
  useEffect(() => {
    if (permission !== "granted" || !estCompatible || doitEtreInstallee) {
      return;
    }

    let actif = true;

    async function verifierAbonnement() {
      setEtatAbonnement("verification");
      setErreur("");

      try {
        const dejaAbonne =
          await pushSubscriptionService.synchroniserAbonnementExistant();

        if (actif) {
          setEtatAbonnement(dejaAbonne ? "actif" : "a_activer");
        }
      } catch (e) {
        console.error("Vérification de l'abonnement Push :", e);
        if (actif) {
          setEtatAbonnement("a_activer");
          setErreur(e.message || "Impossible de vérifier les notifications.");
        }
      }
    }

    verifierAbonnement();
    return () => { actif = false; };
  }, [permission, estCompatible, doitEtreInstallee]);

  async function demanderAutorisation() {
    if (demandeEnCours || !estCompatible || doitEtreInstallee) return;

    setDemandeEnCours(true);
    setErreur("");

    try {
      // Appel direct depuis le clic : requis par les navigateurs.
      const nouvellePermission = await Notification.requestPermission();
      setPermission(nouvellePermission);
    } catch (e) {
      console.error("Autorisation notifications :", e);
      setErreur("Impossible de demander l'autorisation sur cet appareil.");
    } finally {
      setDemandeEnCours(false);
    }
  }

  async function activerAbonnement() {
    if (demandeEnCours || permission !== "granted") return;

    setDemandeEnCours(true);
    setErreur("");
    try {
      await pushSubscriptionService.creerEtEnregistrerAbonnement();
      setEtatAbonnement("actif");
    } catch (e) {
      console.error("Enregistrement de l'abonnement Push :", e);
      setErreur(e.message || "Impossible d'activer les notifications Push.");
    } finally {
      setDemandeEnCours(false);
    }
  }

  return (
    <section className="notification-permission" aria-label="Notifications">
      <div className="notification-permission-icon" aria-hidden="true">
        <Bell size={22} />
      </div>

      <div className="notification-permission-content" aria-live="polite">
        <h2 className="notification-permission-title">Notifications</h2>

        {doitEtreInstallee ? (
          <p className="notification-permission-text">
            Sur iPhone ou iPad, ajoutez d'abord l'application à votre écran
            d'accueil, puis ouvrez-la depuis son icône.
          </p>
        ) : !estCompatible ? (
          <p className="notification-permission-text">
            Les notifications Push ne sont pas disponibles dans ce navigateur
            ou dans ce contexte. Utilisez l'application en HTTPS avec un
            navigateur compatible.
          </p>
        ) : permission === "granted" ? (
          etatAbonnement === "actif" ? (
            <p className="notification-permission-status notification-permission-status--granted">
              Notifications activées sur cet appareil.
            </p>
          ) : etatAbonnement === "verification" || etatAbonnement === "non_verifie" ? (
            <p className="notification-permission-text">
              Vérification de l'abonnement Push…
            </p>
          ) : (
            <>
              <p className="notification-permission-text">
                Autorisation accordée. Il reste à enregistrer cet appareil.
              </p>
              <button
                type="button"
                className="notification-permission-button"
                onClick={activerAbonnement}
                disabled={demandeEnCours}
              >
                {demandeEnCours ? "Enregistrement…" : "Finaliser l'activation"}
              </button>
            </>
          )
        ) : permission === "denied" ? (
          <p className="notification-permission-text">
            Notifications bloquées. Pour les autoriser, modifiez les réglages
            de notification de l'application ou du navigateur.
          </p>
        ) : (
          <>
            <p className="notification-permission-text">
              Autorisez les notifications pour recevoir les informations de la chorale.
            </p>
            <button
              type="button"
              className="notification-permission-button"
              onClick={demanderAutorisation}
              disabled={demandeEnCours}
            >
              {demandeEnCours ? "Demande en cours…" : "Activer les notifications"}
            </button>
          </>
        )}

        {erreur && <p className="notification-permission-error">{erreur}</p>}
      </div>
    </section>
  );
}
