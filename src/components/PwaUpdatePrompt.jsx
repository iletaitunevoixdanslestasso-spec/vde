import { useRegisterSW } from "virtual:pwa-register/react";
import "./PwaUpdatePrompt.css";

export default function PwaUpdatePrompt() {

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker
    } = useRegisterSW({
        onRegistered(registration) {
            console.log(
                "PWA Service Worker enregistré",
                registration
            );
        },

        onRegisterError(error) {
            console.error(
                "Erreur Service Worker PWA",
                error
            );
        }
    });


    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };


    if (!offlineReady && !needRefresh) {
        return null;
    }


    return (
        <div className="pwa-update">

            <div className="pwa-update-message">

                {needRefresh && (
                    <>
                        <strong>
                            Une nouvelle version est disponible
                        </strong>

                        <span>
                            Mettez à jour l'application pour profiter
                            de la dernière version.
                        </span>
                    </>
                )}

                {offlineReady && !needRefresh && (
                    <>
                        <strong>
                            Application prête
                        </strong>

                        <span>
                            L'application peut maintenant fonctionner
                            même avec une connexion limitée.
                        </span>
                    </>
                )}

            </div>


            <div className="pwa-update-actions">

                {needRefresh && (
                    <button
                        type="button"
                        className="pwa-update-button pwa-update-button-primary"
                        onClick={() =>
                            updateServiceWorker(true)
                        }
                    >
                        Mettre à jour
                    </button>
                )}


                <button
                    type="button"
                    className="pwa-update-button"
                    onClick={close}
                >
                    {needRefresh ? "Plus tard" : "OK"}
                </button>

            </div>

        </div>
    );
}