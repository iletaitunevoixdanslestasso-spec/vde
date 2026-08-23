import { Outlet } from "react-router-dom";
import ChanteurMenu from "./ChanteurMenu";
// ChanteurLayout.jsx
import "../../styles/espaceChanteur.css";
export default function ChanteurLayout() {

    return (

        <div className="chanteur-layout">

            {/* =================================================
                SIDEBAR / NAVIGATION
            ================================================= */}

            <aside className="chanteur-sidebar">

                <div className="chanteur-sidebar-inner">

                    <div className="chanteur-brand">

                        <div className="chanteur-brand-icon">
                            <span className="icon icon-musical-note"></span>
                        </div>

                        <div className="chanteur-brand-text">
                            <strong>
                                Chorale
                            </strong>

                            <span>
                                Espace chanteur
                            </span>
                        </div>

                    </div>

                    <ChanteurMenu />

                </div>

            </aside>


            {/* =================================================
                CONTENU
            ================================================= */}

            <main className="chanteur-content">

                <div className="chanteur-content-inner">

                    <Outlet />

                </div>

            </main>

        </div>
    );
}