import { useNavigate, useParams } from "react-router-dom";

export default function ChanteurMenu() {

    const navigate = useNavigate();
    const { token } = useParams();

    const go = (path = "") => {
        navigate(`/chanteur/${token}${path}`);
    };

    return (
        <nav className="chanteur-menu">

            <p
                className="chanteur-menu-item icon-dashboard"
                onClick={() => go("")}
            >
                Tableau de bord
            </p>

            <p
                className="chanteur-menu-item icon-chansons"
                onClick={() => go("/chansons")}
            >
                Mes chansons
            </p>

            <p
                className="chanteur-menu-item icon-concerts"
                onClick={() => go("/concerts")}
            >
                Concerts
            </p>

            <p
                className="chanteur-menu-item icon-repetitions"
                onClick={() => go("/repetitions")}
            >
                Répétitions
            </p>

            <p
                className="chanteur-menu-item icon-votes"
                onClick={() => go("/votes")}
            >
                Votes
            </p>

            <hr />

            <p
                className="chanteur-menu-item icon-inscription"
                onClick={() => go("/inscription")}
            >
                Mon inscription
            </p>

            <p
                className="chanteur-menu-item icon-profil"
                onClick={() => go("/profil")}
            >
                Mon profil
            </p>

        </nav>
    );
}