import { pushSubscriptionRepository } from "../repositories/PushSubscriptionRepository";

function vapidPublicKeyToUint8Array(base64String) {
  const base64 = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

class PushSubscriptionService {
  constructor(repository) {
    this.repository = repository;
    this.registration = null;
  }

  lireToken() {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token chanteur introuvable. Reconnectez-vous à votre espace.");
    }
    return token;
  }
  async preparerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      throw new Error(
        "Ce navigateur ne prend pas en charge les Service Workers."
      );
    }

    const registration =
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

    const activeRegistration = registration.active
      ? registration
      : await navigator.serviceWorker.ready;

    this.registration = activeRegistration;

    return activeRegistration;
  }

  /**
   * Au chargement, on réenregistre un éventuel abonnement EXISTANT.
   * On ne crée jamais un nouvel abonnement automatiquement : la création
   * doit être déclenchée par un clic de l'utilisateur.
   */
  async synchroniserAbonnementExistant() {
    const registration = await this.preparerServiceWorker();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return false;
    }

    await this.repository.enregistrer(this.lireToken(), subscription);
    return true;
  }

  /** À appeler directement dans le gestionnaire du clic utilisateur. */
  async creerEtEnregistrerAbonnement() {
    if (!this.registration) {
      throw new Error("Le Service Worker n'est pas encore prêt.");
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
    if (!vapidPublicKey) {
      throw new Error(
        "VITE_VAPID_PUBLIC_KEY est absente. Ajoutez-la dans .env, puis redémarrez Vite."
      );
    }

    const token = this.lireToken();
    const applicationServerKey = vapidPublicKeyToUint8Array(vapidPublicKey);

    // Le premier appel asynchrone est subscribe(), initié par le clic.
    // Il n'y a pas d'attente réseau préalable : important pour Safari/iOS.
    const subscription = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await this.repository.enregistrer(token, subscription);
  }
}

export const pushSubscriptionService = new PushSubscriptionService(
  pushSubscriptionRepository
);
