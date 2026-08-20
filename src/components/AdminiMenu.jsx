import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SaisonController } from "../controllers/SaisonController";
import { useSaison } from "./contexts/SaisonContext";

export default function AdminMenu() {

    const navigate = useNavigate();
    const controller = new SaisonController();

    const [openSaisons, setOpenSaisons] = useState(true);
    const [openReferentiels, setOpenReferentiels] = useState(true);
    const [openSeason, setOpenSeason] = useState({});

    const {
        saisonActive,
        saisons,
        updateSaisonSelectionne
    } = useSaison();

    const handleClickSaison = (saison, typeListe) => {
        updateSaisonSelectionne(saison);
        navigate(`/admin/saisons/${saison.nom}/${typeListe}`);
    };

    const toggleSeason = (id) => {
        setOpenSeason(prev => ({
            [id]: !prev[id]
        }));
    };

    return (
        <nav className="admin-menu">

            {/* TABLEAU DE BORD */}

            <p
                className="admin-menu-item icon-dashboard"
                onClick={() => navigate("/admin")}
            >
                Tableau de bord
            </p>

            <hr />


            {/* SAISONS */}

            <p
                className="admin-menu-section icon-saisons"
                onClick={() => setOpenSaisons(!openSaisons)}
            >
                Saisons {openSaisons ? "▼" : "▶"}
            </p>

            {openSaisons && saisons.map(saison => (

                <div key={saison.id}>

                    <p
                        className={`admin-menu-item admin-season ${
                            saison.active
                                ? "active icon-saison-active"
                                : "icon-saison"
                        }`}
                        onClick={() => toggleSeason(saison.id)}
                    >
                        {saison.nom}{" "}
                        {openSeason[saison.id] ? "▼" : "▶"}
                    </p>

                    {openSeason[saison.id] && (

                        <div className="admin-season-items">

                            <p
                                className="admin-menu-item icon-chanteurs"
                                onClick={() =>
                                    handleClickSaison(
                                        saison,
                                        "chanteurs"
                                    )
                                }
                            >
                                Choristes
                            </p>

                            <p
                                className="admin-menu-item icon-chansons"
                                onClick={() =>
                                    handleClickSaison(
                                        saison,
                                        "chansons"
                                    )
                                }
                            >
                                Chansons
                            </p>

                            <p
                                className="admin-menu-item icon-repetition"
                                onClick={() =>
                                    handleClickSaison(
                                        saison,
                                        "repetition"
                                    )
                                }
                            >
                                Répétitions
                            </p>
                            <p
                                className="admin-menu-item icon-groupes"
                                onClick={() =>
                                    handleClickSaison(
                                        saison,
                                        "groupes"
                                    )
                                }
                            >
                                Groupes
                            </p>

                            <p
                                className="admin-menu-item icon-concerts"
                                onClick={() =>
                                    navigate(
                                        `/admin/saisons/${saison.id}/concerts`
                                    )
                                }
                            >
                                Concerts
                            </p>

                            <p
                                className="admin-menu-item icon-repetitions"
                                onClick={() =>
                                    navigate(
                                        `/admin/saisons/${saison.id}/repetitions`
                                    )
                                }
                            >
                                Répétitions
                            </p>

                        </div>
                    )}

                </div>
            ))}

            <hr />


            {/* REFERENTIELS */}

            <p
                className="admin-menu-section icon-referentiels"
                onClick={() =>
                    setOpenReferentiels(!openReferentiels)
                }
            >
                Référentiels{" "}
                {openReferentiels ? "▼" : "▶"}
            </p>

            {openReferentiels && (

                <div>

                    <p
                        className="admin-menu-item icon-saisons"
                        onClick={() =>
                            navigate("/admin/saisons")
                        }
                    >
                        Saisons
                    </p>

                    <p
                        className="admin-menu-item icon-chanteurs"
                        onClick={() =>
                            navigate("/admin/chanteurs")
                        }
                    >
                        Adhérents
                    </p>

                    <p
                        className="admin-menu-item icon-chansons"
                        onClick={() =>
                            navigate("/admin/chansons")
                        }
                    >
                        Chansons
                    </p>

                    <p
                        className="admin-menu-item icon-pupitres"
                        onClick={() =>
                            navigate("/admin/pupitres")
                        }
                    >
                        Pupitres
                    </p>

                    <p
                        className="admin-menu-item icon-documents"
                        onClick={() =>
                            navigate("/admin/documents")
                        }
                    >
                        Documents
                    </p>

                    <p
                        className="admin-menu-item icon-concerts"
                        onClick={() =>
                            navigate("/admin/concerts")
                        }
                    >
                        Concerts
                    </p>

                    <p
                        className="admin-menu-item icon-repetitions"
                        onClick={() =>
                            navigate("/admin/repetitions")
                        }
                    >
                        Répétitions
                    </p>

                    <p
                        className="admin-menu-item icon-invitations"
                        onClick={() =>
                            navigate("/admin/invitations")
                        }
                    >
                        Invitations
                    </p>

                </div>
            )}

            <hr />

        </nav>
    );
}