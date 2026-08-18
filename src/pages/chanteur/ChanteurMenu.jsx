import { useNavigate, useParams } from "react-router-dom";

export default function ChanteurMenu() {

    const navigate = useNavigate();
    const { token } = useParams();

    const go = (path = "") => {
        navigate(`/chanteur/${token}${path}`);
    };

    return (
        <nav>

          <h2 className="logo-title">
            <img src="/logoVDE.png" alt="Chorale" />
            <span>Chorale</span>
          </h2>
            <hr />

            <p
                style={{ cursor: "pointer" }}
                onClick={() => go("")}
            >
                🏠 Tableau de bord
            </p>

            <p
                style={{ cursor: "pointer" }}
                onClick={() => go("/chansons")}
            >
                🎵 Mes chansons
            </p>

            <p
                style={{ cursor: "pointer" }}
                onClick={() => go("/concerts")}
            >
                🎤 Concerts
            </p>

            <p
                style={{ cursor: "pointer" }}
                onClick={() => go("/repetitions")}
            >
                🗓 Répétitions
            </p>

            <p
                style={{ cursor: "pointer" }}
                onClick={() => go("/votes")}
            >
                🗳️ Votes
            </p>

            <hr />

            <p
                style={{ cursor: "pointer" }}
                onClick={() => go("/inscription")}
            >
                📝 Mon inscription
            </p>
            <p
                style={{ cursor: "pointer" }}
                onClick={() => go("/profil")}
            >
                📝 Mon profil
            </p>

        </nav>
    );
}