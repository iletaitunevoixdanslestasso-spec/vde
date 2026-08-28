import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/adminMenu.css";
import { useSaison } from "./contexts/SaisonContext";

export default function AdminMenu() {

    const navigate = useNavigate();

    const [openSaisons, setOpenSaisons] = useState(false);
    const [openReferentiels, setOpenReferentiels] = useState(false);
    const [openSeason, setOpenSeason] = useState({});

    const {
        saisons,
        updateSaisonSelectionne
    } = useSaison();

    const handleClickSaison = (saison, typeListe) => {

        updateSaisonSelectionne(saison);

        setOpenSaisons(true);

        setOpenSeason(prev => ({
            ...prev,
            [saison.id]: true
        }));

        navigate(`/admin/saison/${saison.nom}/${typeListe}`);
    };

    const toggleSeason = (id) => {

        setOpenSeason(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const closeMenus = () => {

        setOpenSaisons(false);
        setOpenReferentiels(false);
    };

    const toggleSaisons = () => {

        setOpenSaisons(prev => !prev);
        setOpenReferentiels(false);
    };

    const toggleReferentiels = () => {

        setOpenReferentiels(prev => !prev);
        setOpenSaisons(false);
    };

    const handleClickReferentiel = (path) => {

        navigate(path);

        setOpenReferentiels(true);
        setOpenSaisons(false);
    };

    return (
        <nav className="admin-menu">

            <div className="admin-menu-main">

                <button
                    type="button"
                    className="admin-menu-item admin-menu-dashboard icon-dashboard"
                    onClick={() => {
                        navigate("/admin");
                        closeMenus();
                    }}
                >
                    <span>Tableau de bord</span>
                </button>

                <button
                    type="button"
                    className={`admin-menu-section icon-saisons ${openSaisons ? "open" : ""}`}
                    onClick={toggleSaisons}
                >
                    <span>Saisons</span>

                    <span className="admin-menu-arrow">
                        {openSaisons ? "⌃" : "⌄"}
                    </span>
                </button>

                <button
                    type="button"
                    className={`admin-menu-section icon-referentiels ${openReferentiels ? "open" : ""}`}
                    onClick={toggleReferentiels}
                >
                    <span>Référentiels</span>

                    <span className="admin-menu-arrow">
                        {openReferentiels ? "⌃" : "⌄"}
                    </span>
                </button>

            </div>

            {openSaisons && (

                <div className="admin-dropdown admin-dropdown-seasons">

                    <div className="admin-dropdown-title">
                        <span className="icon-saisons">
                            Saisons
                        </span>
                    </div>

                    <div className="admin-dropdown-content">

                        {saisons.map((saison) => (

                            <div
                                key={saison.id}
                                className="admin-season-group"
                            >

                                <button
                                    type="button"
                                    className={`admin-season ${saison.active ? "active" : ""}`}
                                    onClick={() => toggleSeason(saison.id)}
                                >
                                    <span
                                        className={
                                            saison.active
                                                ? "icon-saison-active"
                                                : "icon-saison"
                                        }
                                    >
                                        {saison.nom}
                                    </span>

                                    <span className="admin-menu-arrow">
                                        {openSeason[saison.id] ? "⌃" : "›"}
                                    </span>
                                </button>

                                {openSeason[saison.id] && (

                                    <div className="admin-season-items">

                                        <button
                                            type="button"
                                            className="admin-menu-item icon-chanteurs"
                                            onClick={() =>
                                                handleClickSaison(
                                                    saison,
                                                    "chanteurs"
                                                )
                                            }
                                        >
                                            Choristes
                                        </button>

                                        <button
                                            type="button"
                                            className="admin-menu-item icon-chansons"
                                            onClick={() =>
                                                handleClickSaison(
                                                    saison,
                                                    "chansons"
                                                )
                                            }
                                        >
                                            Chansons
                                        </button>

                                        <button
                                            type="button"
                                            className="admin-menu-item icon-repetition"
                                            onClick={() =>
                                                handleClickSaison(
                                                    saison,
                                                    "repetition"
                                                )
                                            }
                                        >
                                            Répétitions
                                        </button>

                                        <button
                                            type="button"
                                            className="admin-menu-item icon-groupes"
                                            onClick={() =>
                                                handleClickSaison(
                                                    saison,
                                                    "groupes"
                                                )
                                            }
                                        >
                                            Groupes
                                        </button>

                                        <button
                                            type="button"
                                            className="admin-menu-item icon-concerts"
                                            onClick={() =>
                                                handleClickSaison(
                                                    saison,
                                                    "concerts"
                                                )
                                            }
                                        >
                                            Concerts
                                        </button>

                                    </div>
                                )}

                            </div>
                        ))}

                    </div>
                </div>
            )}

            {openReferentiels && (

                <div className="admin-dropdown admin-dropdown-referentiels">

                    <div className="admin-dropdown-title">
                        <span className="icon-referentiels">
                            Référentiels
                        </span>
                    </div>

                    <div className="admin-dropdown-content">

                        <button
                            type="button"
                            className="admin-menu-item icon-saisons"
                            onClick={() => {
                                handleClickReferentiel("/admin/saisons");
                            }}
                        >
                            Saisons
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-chanteurs"
                            onClick={() => {
                                handleClickReferentiel("/admin/chanteurs");
                            }}
                        >
                            Adhérents
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-chansons"
                            onClick={() => {
                                handleClickReferentiel("/admin/chansons");
                            }}
                        >
                            Chansons
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-pupitres"
                            onClick={() => {
                                handleClickReferentiel("/admin/pupitres");
                            }}
                        >
                            Pupitres
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-documents"
                            onClick={() => {
                                handleClickReferentiel("/admin/documents");
                            }}
                        >
                            Documents
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-concerts"
                            onClick={() => {
                                handleClickReferentiel("/admin/concerts");
                            }}
                        >
                            Concerts
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-lieux"
                            onClick={() => {
                                handleClickReferentiel("/admin/lieux");
                            }}
                        >
                            Lieux
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-repetitions"
                            onClick={() => {
                                handleClickReferentiel("/admin/repetitions");
                            }}
                        >
                            Répétitions
                        </button>

                        <button
                            type="button"
                            className="admin-menu-item icon-invitations"
                            onClick={() => {
                                handleClickReferentiel("/admin/invitations");
                            }}
                        >
                            Invitations
                        </button>

                    </div>
                </div>
            )}

        </nav>
    );
}
