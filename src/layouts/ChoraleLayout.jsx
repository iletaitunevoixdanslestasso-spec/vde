import { Outlet } from "react-router-dom";
import { useSaison } from "../components/contexts/SaisonContext";
import NotificationProvider from "../components/contexts/NotificationProvider";

import "../styles/chorale.css";

export default function ChoraleLayout() {

    const { saisonActive } = useSaison();

    return (
        <NotificationProvider>

            <div className="chorale-layout">

                {/* HEADER COMMUN */}
                <header className="chorale-header">

                    <div className="chorale-brand">

                        <img
                            src="/logoVDE.png"
                            alt="Chorale"
                        />

                        <span>Chorale</span>

                    </div>

                    <div className="chorale-saison">

                        🎼 Saison active :

                        <strong>
                            {saisonActive?.nom ?? "Aucune"}
                        </strong>

                    </div>

                </header>


                {/* CONTENU */}
                <div className="chorale-body">

                    <Outlet />

                </div>

            </div>

        </NotificationProvider>
    );
}