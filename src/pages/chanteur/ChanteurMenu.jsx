import { useNavigate, useParams, useLocation } from "react-router-dom";

export default function ChanteurMenu() {

    const navigate = useNavigate();
    const location = useLocation();

    const { token } = useParams();


    const go = (path = "") => {

        navigate(
            `/chanteur/${token}${path}`
        );

    };


    const isActive = (path = "") => {

        const current =
            `/chanteur/${token}${path}`;

        return location.pathname === current;

    };


    return (

        <nav className="chanteur-menu">

            {/* =================================================
                PRINCIPAL
            ================================================= */}

            <div className="chanteur-menu-section">

                <div className="chanteur-menu-section-title">
                    Chorale
                </div>


                <button
                    type="button"
                    className={
                        `chanteur-menu-item icon-dashboard ` +
                        (isActive()
                            ? "active"
                            : "")
                    }
                    onClick={() => go("")}
                >
                    <span className="chanteur-menu-label">
                        Tableau de bord
                    </span>
                </button>


                <button
                    type="button"
                    className={
                        `chanteur-menu-item icon-chansons ` +
                        (isActive("/chansons")
                            ? "active"
                            : "")
                    }
                    onClick={() => go("/chansons")}
                >
                    <span className="chanteur-menu-label">
                        Mes chansons
                    </span>
                </button>


                <button
                    type="button"
                    className={
                        `chanteur-menu-item icon-concerts ` +
                        (isActive("/concerts")
                            ? "active"
                            : "")
                    }
                    onClick={() => go("/concerts")}
                >
                    <span className="chanteur-menu-label">
                        Concerts
                    </span>
                </button>


                <button
                    type="button"
                    className={
                        `chanteur-menu-item icon-repetitions ` +
                        (isActive("/repetitions")
                            ? "active"
                            : "")
                    }
                    onClick={() => go("/repetitions")}
                >
                    <span className="chanteur-menu-label">
                        Répétitions
                    </span>
                </button>


                {/* <button
                    type="button"
                    className={
                        `chanteur-menu-item icon-votes ` +
                        (isActive("/votes")
                            ? "active"
                            : "")
                    }
                    onClick={() => go("/votes")}
                >
                    <span className="chanteur-menu-label">
                        Votes
                    </span>
                </button> */}

            </div>


            {/* =================================================
                MON ESPACE
            ================================================= */}

            <div className="chanteur-menu-section">

                <div className="chanteur-menu-section-title">
                    Mon espace
                </div>

{/* 
                <button
                    type="button"
                    className={
                        `chanteur-menu-item icon-inscription ` +
                        (isActive("/inscription")
                            ? "active"
                            : "")
                    }
                    onClick={() => go("/inscription")}
                >
                    <span className="chanteur-menu-label">
                        Mon inscription
                    </span>
                </button>
 */}

                <button
                    type="button"
                    className={
                        `chanteur-menu-item icon-profil ` +
                        (isActive("/profil")
                            ? "active"
                            : "")
                    }
                    onClick={() => go("/profil")}
                >
                    <span className="chanteur-menu-label">
                        Mon profil
                    </span>
                </button>

            </div>

        </nav>
    );
}