import { useEffect, useState } from "react";
import { notificationMessageService } from "../services/NotificationMessageService";

// Partagé par les icônes du menu, du tableau de bord et de l'activation Push.
export default function useNotificationsNonLues(token) {
  const [etat, setEtat] = useState({ token, nombre: null });

  useEffect(() => {
    if (!token) return;

    let actif = true;
    let version = 0;

    const actualiser = async () => {
      const requete = ++version;
      try {
        const nombre = await notificationMessageService.compterNonLus(token);
        if (actif && requete === version) {
          setEtat({ token, nombre });
        }
      } catch {
        // Une erreur de compteur ne doit pas empêcher d'ouvrir la messagerie.
        if (actif && requete === version) {
          setEtat({ token, nombre: null });
        }
      }
    };

    const desabonner = notificationMessageService.subscribe(token, (nombre) => {
      if (!actif) return;
      if (typeof nombre === "number") {
        version += 1;
        setEtat({ token, nombre });
      } else {
        actualiser();
      }
    });
    const auRetour = () => {
      if (document.visibilityState === "visible") actualiser();
    };

    actualiser();
    window.addEventListener("focus", auRetour);
    document.addEventListener("visibilitychange", auRetour);

    return () => {
      actif = false;
      version += 1;
      desabonner();
      window.removeEventListener("focus", auRetour);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [token]);

  return etat.token === token ? etat.nombre : null;
}
