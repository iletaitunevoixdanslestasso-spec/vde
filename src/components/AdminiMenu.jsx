import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SaisonController } from "../controllers/SaisonController";
import { useSaison } from "./contexts/SaisonContext";

export default function AdminMenu() {
    const navigate = useNavigate();
    const controller = new SaisonController();

    const [openSaisons, setOpenSaisons] = useState(true);
    const [openReferentiels, setOpenReferentiels] = useState(true);
    const [openSeason, setOpenSeason] = useState({});
    // const [saisons, setSaisons] = useState([]);
    const {
        saisonActive,
        saisons,
        updateSaisonSelectionne
    } = useSaison();

    
    const handleClickSaison =(saison, typeListe) => {
        updateSaisonSelectionne(saison)
         navigate(`/admin/saisons/${saison.nom}/${typeListe}`)
    }

    const toggleSeason = (id) => {
        setOpenSeason(prev => ({
            // si je veux garder plusieurs elements ouverts je decommente // ...prev, 
            // ...prev, 
            [id]: !prev[id]
        }));
    };

    return (
        <nav style={{ marginTop: 30 }}>
            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin")}>
                🏠 Tabelau de bord
            </p>

            <hr />            
            <p
                style={{ cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setOpenSaisons(!openSaisons)}
            >
                🎼 Saisons {openSaisons ? "▼" : "▶"}
            </p>
            {openSaisons && saisons.map(saison => (

                <div key={saison.id}>

                    <p
                        style={{
                            paddingLeft: 10,
                            cursor: "pointer",
                            fontWeight: saison.active ? "bold" : "normal"
                        }}
                        onClick={() => toggleSeason(saison.id)}
                    >
                        {saison.active ? "⭐" : "📅"} {saison.nom} {openSeason[saison.id] ? "▼" : "▶"}
                    </p>

                    {openSeason[saison.id] && (

                        <div style={{ paddingLeft: 30 }}>

                            <p
                                style={{ cursor: "pointer" }}
                                onClick={() => handleClickSaison(saison, "chanteurs")}
                                // onClick={() => navigate(`/admin/saisons/${saison.id}/chanteurs`)}
                                >
                                👤 Choristes
                            </p>

                            <p
                                style={{ cursor: "pointer" }}
                                onClick={() => handleClickSaison(saison, "chansons")}
                                // onClick={() => navigate(`/admin/saisons/${saison.id}/chansons`)}
                            >
                                🎵 Chansons
                            </p>
                            <p
                                style={{ cursor: "pointer" }}
                                onClick={() => handleClickSaison(saison, "groupes")}
                            >
                                🎵 Groupes
                            </p>


                            <p
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/admin/saisons/${saison.id}/concerts`)}
                            >
                                🎤 Concerts
                            </p>

                            <p
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/admin/saisons/${saison.id}/repetitions`)}
                            >
                                🗓 Répétitions
                            </p>

                        </div>

                    )}

                </div>

            ))}

            <hr />
            <p
                style={{ cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setOpenReferentiels(!openReferentiels)}
            >
            📚 Référentiels {openReferentiels ? "▼" : "▶"}
            </p>
             {openReferentiels && (
                <div>
            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/saisons")}>
                📅 Saisons
            </p>

            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/chanteurs")}>
                👤 Adhérents
            </p>

            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/chansons")}>
                🎵 Chansons
            </p>

            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/pupitres")}>
                🎼 Puptitres
            </p>

            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/documents")}>
                🎼 Documents
            </p>

            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/concerts")}>
                🎤 Concerts
            </p>

            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/repetitions")}>
                🗓 Répétitions
            </p>


            <p style={{ cursor: "pointer" }} onClick={() => navigate("/admin/invitations")}>
                📨 Invitations
            </p>
            </div>
             )}
            <hr />




        </nav>
    );
}