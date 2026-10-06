
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./../styles/adminMenu.css";
import { useSaison } from "./contexts/SaisonContext";
import { useHorizontalScroll } from "../hooks/useHorizontalScroll";


export default function AdminMenu() {

    /* =====================================================
       GESTION DES SCROLLS HORIZONTAUX
       ===================================================== */

    const mainScroll = useHorizontalScroll();
    const saisonsScroll = useHorizontalScroll();
    const referentielsScroll = useHorizontalScroll();


    /* =====================================================
       GESTION DU CONTENU DU MENU
       ===================================================== */

    const navigate = useNavigate();
    const location = useLocation();
    const saisonRefs = useRef({});

    const [openSaisons, setOpenSaisons] = useState(false);
    const [openReferentiels, setOpenReferentiels] = useState(false);

    // Une seule saison peut être ouverte à la fois
    const [openSeason, setOpenSeason] = useState(null);


    const {
        saisons,
        saisonSelectionne,
        updateSaisonSelectionne
    } = useSaison();


    /* =====================================================
       SAISON
       ===================================================== */

    const handleClickSaison = (saison, typeListe) => {

        updateSaisonSelectionne(saison);

        setOpenSaisons(true);

        navigate(`/admin/saison/${encodeURIComponent(saison.nom)}/${typeListe}`);
    };


    /*
     * Ouvre / ferme une saison.
     *
     * - à l'ouverture : la saison devient la saison sélectionnée
     *   et on ouvre directement sa page Choristes ;
     * - à la fermeture : on ne navigue pas et surtout on ne
     *   recalcule pas le scroll, afin que la saison ne "bouge" pas.
     */
    const handleToggleSeason = (saison) => {

        const isOpening = openSeason !== saison.id;

        if (!isOpening) {
            setOpenSeason(null);
            return;
        }

        updateSaisonSelectionne(saison);
        setOpenSeason(saison.id);
        setOpenSaisons(true);
        setOpenReferentiels(false);

        navigate(
            `/admin/saison/${encodeURIComponent(saison.nom)}/chanteurs`
        );

        // Le scroll n'est effectué qu'à l'ouverture.
        // Ainsi, une fermeture ne recentre plus la saison.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                saisonsScroll.scrollToElement(
                    saisonRefs.current[saison.id]
                );
            });
        });
    };


    /* =====================================================
       FERMETURE MENUS
       ===================================================== */

    const closeMenus = () => {

        setOpenSaisons(false);
        setOpenReferentiels(false);
        setOpenSeason(null);
    };


    /* =====================================================
       MENU SAISONS
       ===================================================== */

    const toggleSaisons = () => {

        setOpenSaisons(prev => !prev);
        setOpenReferentiels(false);
    };


    /* =====================================================
       MENU REFERENTIELS
       ===================================================== */

    const toggleReferentiels = () => {

        setOpenReferentiels(prev => !prev);
        setOpenSaisons(false);
        setOpenSeason(null);
    };


    const handleClickReferentiel = (path) => {

        navigate(path);

        setOpenReferentiels(true);
        setOpenSaisons(false);
        setOpenSeason(null);
    };


    /* =====================================================
       GESTION DES SCROLLS
       ===================================================== */

    useEffect(() => {

        if (!openSaisons && !openReferentiels) {
            return;
        }

        const update = () => {

            if (openSaisons) {
                saisonsScroll.updateScrollState();
            }

            if (openReferentiels) {
                referentielsScroll.updateScrollState();
            }
        };

        // Le DOM doit être rendu avant de mesurer
        // scrollWidth / clientWidth
        requestAnimationFrame(() => {
            requestAnimationFrame(update);
        });

    }, [
        openSaisons,
        openReferentiels,
        saisonsScroll.updateScrollState,
        referentielsScroll.updateScrollState
    ]);

    useEffect(() => {

        const pathname = location.pathname;

        /*
         * ================================================
         * ROUTE D'UNE SAISON
         * ================================================
         */

        const saisonMatch =
            pathname.match(/^\/admin\/saison\/([^/]+)(?:\/|$)/);

        if (saisonMatch) {

            const saisonNom =
                decodeURIComponent(saisonMatch[1]);

            const saison =
                saisons.find(
                    item => item.nom === saisonNom
                );

            // Ouvre le menu Saisons
            setOpenSaisons(true);
            setOpenReferentiels(false);

            if (saison) {

                // Ouvre automatiquement la bonne saison
                setOpenSeason(saison.id);

                // Synchronise aussi le SaisonContext
                if (saisonSelectionne?.id !== saison.id) {
                    updateSaisonSelectionne(saison);
                }
            }

            return;
        }


        /*
         * ================================================
         * ROUTES REFERENTIELS
         * ================================================
         */

        const isReferentielRoute =
            pathname === "/admin/saisons" ||
            pathname === "/admin/chanteurs" ||
            pathname === "/admin/chansons" ||
            pathname.startsWith("/admin/chanson/") ||
            pathname === "/admin/pupitres" ||
            pathname === "/admin/documents" ||
            pathname === "/admin/concerts" ||
            pathname === "/admin/lieux" ||
            pathname === "/admin/repetitions";

        if (isReferentielRoute) {

            setOpenReferentiels(true);
            setOpenSaisons(false);
            setOpenSeason(null);

            return;
        }


        /*
         * ================================================
         * AUTRES ROUTES
         * ================================================
         */

        setOpenSaisons(false);
        setOpenReferentiels(false);
        setOpenSeason(null);

    }, [
        location.pathname,
        saisons,
        saisonSelectionne?.id,
        updateSaisonSelectionne
    ]);
    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <nav className="admin-menu">


            {/* =================================================
               MENU PRINCIPAL
               ================================================= */}

            <div className="admin-horizontal-scroll-wrapper">

                {mainScroll.canScrollLeft && (
                    <button
                        type="button"
                        className="admin-scroll-arrow admin-scroll-arrow-left"
                        onClick={mainScroll.scrollLeft}
                    >
                        ‹
                    </button>
                )}

                <div
                    ref={mainScroll.scrollRef}
                    className="admin-menu-main"
                >

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
                        className={`admin-menu-section icon-saison ${openSaisons ? "open" : ""
                            }`}
                        onClick={toggleSaisons}
                    >
                        <span>Saisons</span>

                        <span className="admin-menu-arrow">
                            {openSaisons ? "⌃" : "⌄"}
                        </span>
                    </button>


                    <button
                        type="button"
                        className={`admin-menu-section icon-referentiels ${openReferentiels ? "open" : ""
                            }`}
                        onClick={toggleReferentiels}
                    >
                        <span>Référentiels</span>

                        <span className="admin-menu-arrow">
                            {openReferentiels ? "⌃" : "⌄"}
                        </span>
                    </button>

                </div>


                {mainScroll.canScrollRight && (
                    <button
                        type="button"
                        className="admin-scroll-arrow admin-scroll-arrow-right"
                        onClick={mainScroll.scrollRight}
                    >
                        ›
                    </button>
                )}

            </div>


            {/* =================================================
               DROPDOWN SAISONS
               ================================================= */}

            {openSaisons && (

                <div className="admin-dropdown admin-dropdown-seasons">

                    <div className="admin-dropdown-title">
                        <span className="icon-saison">
                            Saisons
                        </span>
                    </div>


                    <div className="admin-horizontal-scroll-wrapper">


                        {/* FLECHE GAUCHE */}

                        {saisonsScroll.hasHorizontalScroll &&
                            saisonsScroll.canScrollLeft && (
                                <button
                                    type="button"
                                    className="admin-scroll-arrow admin-scroll-arrow-left"
                                    onClick={saisonsScroll.scrollLeft}
                                >
                                    ‹
                                </button>
                            )}


                        {/* CONTENU SCROLLABLE */}

                        <div
                            ref={saisonsScroll.scrollRef}
                            className="admin-dropdown-content"
                        >

                            {saisons.map((saison) => (

                                <div
                                    key={saison.id}
                                    className={`admin-season-group ${
                                        openSeason === saison.id ? "open" : ""
                                    }`}
                                >

                                    <button
                                        ref={(el) => {
                                            saisonRefs.current[saison.id] = el;
                                        }}
                                        type="button"
                                        className={`admin-season ${openSeason == saison.id ? "active" : ""
                                            }`}
                                        onClick={() =>
                                            handleToggleSeason(saison)
                                        }
                                    >

                                        <span
                                            className={
                                                saison.active
                                                    ? "icon-saisonactive"
                                                    : "icon-saison"
                                            }
                                        >
                                            {saison.nom}
                                        </span>


                                        <span className="admin-menu-arrow">
                                            {openSeason === saison.id
                                                ? "⌃"
                                                : "›"}
                                        </span>

                                    </button>


                                    {/* =================================
                                       SOUS-MENU DE LA SAISON
                                       ================================= */}

                                    {openSeason === saison.id && (

                                        <div className="admin-season-items">

                                            <button
                                                type="button"
                                                className="admin-menu-item icon-chanteursaison"
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
                                                className="admin-menu-item icon-chanson"
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
                                                className="admin-menu-item icon-groupe"
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
                                                className="admin-menu-item icon-concert"
                                                onClick={() =>
                                                    handleClickSaison(
                                                        saison,
                                                        "concerts"
                                                    )
                                                }
                                            >
                                                Concerts
                                            </button>

                                            <button
                                                type="button"
                                                className="admin-menu-item icon-invitation"
                                                onClick={() =>
                                                    handleClickSaison(
                                                        saison,
                                                        "invitations"
                                                    )
                                                }
                                            >
                                                Invitations
                                            </button>

                                        </div>

                                    )}

                                </div>

                            ))}

                        </div>


                        {/* FLECHE DROITE */}

                        {saisonsScroll.hasHorizontalScroll &&
                            saisonsScroll.canScrollRight && (
                                <button
                                    type="button"
                                    className="admin-scroll-arrow admin-scroll-arrow-right"
                                    onClick={saisonsScroll.scrollRight}
                                >
                                    ›
                                </button>
                            )}

                    </div>

                </div>

            )}


            {/* =================================================
               DROPDOWN REFERENTIELS
               ================================================= */}

            {openReferentiels && (

                <div className="admin-dropdown admin-dropdown-referentiels">

                    <div className="admin-dropdown-title">
                        <span className="icon-referentiels">
                            Référentiels
                        </span>
                    </div>


                    <div className="admin-horizontal-scroll-wrapper">


                        {/* FLECHE GAUCHE */}

                        {referentielsScroll.hasHorizontalScroll &&
                            referentielsScroll.canScrollLeft && (
                                <button
                                    type="button"
                                    className="admin-scroll-arrow admin-scroll-arrow-left"
                                    onClick={referentielsScroll.scrollLeft}
                                >
                                    ‹
                                </button>
                            )}


                        {/* CONTENU SCROLLABLE */}

                        <div
                            ref={referentielsScroll.scrollRef}
                            className="admin-dropdown-content"
                        >

                            <button
                                type="button"
                                className="admin-menu-item icon-saison"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/saisons"
                                    )
                                }
                            >
                                Saisons
                            </button>


                            <button
                                type="button"
                                className="admin-menu-item icon-groupe"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/chanteurs"
                                    )
                                }
                            >
                                Adhérents
                            </button>


                            <button
                                type="button"
                                className="admin-menu-item icon-chanson"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/chansons"
                                    )
                                }
                            >
                                Chansons
                            </button>


                            <button
                                type="button"
                                className="admin-menu-item icon-pupitre"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/pupitres"
                                    )
                                }
                            >
                                Pupitres
                            </button>


                            <button
                                type="button"
                                className="admin-menu-item icon-document"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/documents"
                                    )
                                }
                            >
                                Documents
                            </button>


                            <button
                                type="button"
                                className="admin-menu-item icon-concert"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/concerts"
                                    )
                                }
                            >
                                Concerts
                            </button>


                            <button
                                type="button"
                                className="admin-menu-item icon-lieux"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/lieux"
                                    )
                                }
                            >
                                Lieux
                            </button>


                            <button
                                type="button"
                                className="admin-menu-item icon-repetition"
                                onClick={() =>
                                    handleClickReferentiel(
                                        "/admin/repetitions"
                                    )
                                }
                            >
                                Répétitions
                            </button>


                        </div>


                        {/* FLECHE DROITE */}

                        {referentielsScroll.hasHorizontalScroll &&
                            referentielsScroll.canScrollRight && (
                                <button
                                    type="button"
                                    className="admin-scroll-arrow admin-scroll-arrow-right"
                                    onClick={referentielsScroll.scrollRight}
                                >
                                    ›
                                </button>
                            )}

                    </div>

                </div>

            )}

        </nav>
    );
}
