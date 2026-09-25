import { useEffect, useRef, useState } from "react";
import "./../styles/representationChoeur.css";

function IconChanteur({
    x,
    y,
    couleur,
    nom,
    index
}) {
    return (
        <g
            className="svg-chanteur"
            transform={`translate(${x}, ${y})`}
            style={{
                color: couleur
            }}
        >
            <title>
                {nom || `Chanteur ${index + 1}`}
            </title>

            <circle
                className="svg-chanteur-fond"
                cx="0"
                cy="0"
                r="16"
                style={{
                    fill: couleur
                }}
            />

            <circle
                className="svg-chanteur-tete"
                cx="0"
                cy="-6"
                r="5"
            />

            <path
                className="svg-chanteur-corps"
                d="M-9 10 C-9 3 -5 0 0 0 C5 0 9 3 9 10"
            />

        </g>
    );
}


export default function RepresentationChoeur({
    pupitres = [],
    titre = "Le chœur"
}) {
    const choeurRef = useRef(null);
    const [pleinEcran, setPleinEcran] = useState(false);
    const [erreurPleinEcran, setErreurPleinEcran] = useState("");

    useEffect(() => {
        const synchroniserPleinEcran = () => {
            setPleinEcran(
                document.fullscreenElement !== null &&
                document.fullscreenElement === choeurRef.current
            );
        };

        document.addEventListener(
            "fullscreenchange",
            synchroniserPleinEcran
        );

        return () => {
            document.removeEventListener(
                "fullscreenchange",
                synchroniserPleinEcran
            );
        };
    }, []);

    const basculerPleinEcran = async () => {
        const element = choeurRef.current;

        if (!element) return;

        setErreurPleinEcran("");

        try {
            if (document.fullscreenElement === element) {
                await document.exitFullscreen();
            } else if (
                document.fullscreenEnabled &&
                element.requestFullscreen
            ) {
                await element.requestFullscreen();
            } else {
                setErreurPleinEcran(
                    "Le plein écran n’est pas disponible dans ce navigateur ou ce contexte."
                );
            }
        } catch {
            setErreurPleinEcran(
                "Impossible d’activer ou de quitter le plein écran."
            );
        }
    };
    const totalChanteurs =
        pupitres.reduce(
            (total, pupitre) =>
                total + (pupitre.chanteurs?.length || 0),
            0
        );


    if (!pupitres.length) {
        return (
            <div className="representation-choeur empty">

                <div className="choeur-empty-icon">
                    🎵
                </div>

                <div className="choeur-empty-text">
                    Aucun pupitre à afficher
                </div>

            </div>
        );
    }


    /* =========================================================
       DIMENSIONS DYNAMIQUES
    ========================================================= */

    const viewBoxWidth = 800;

    /*
     * La hauteur dépend du nombre de chanteurs.
     *
     * Minimum : 220
     * Maximum : 390
     */
    const viewBoxHeight = Math.min(
        390,
        Math.max(
            220,
            175 + totalChanteurs * 12
        )
    );


    const centreX = viewBoxWidth / 2;


    /*
     * Plus il y a de chanteurs,
     * plus on ouvre la scène.
     */
    const rayonX = Math.min(
        350,
        250 + totalChanteurs * 8
    );


    const rayonY = Math.min(
        170,
        105 + totalChanteurs * 5
    );


    /*
     * Le centre de l'arc.
     */
    const centreY =
        viewBoxHeight - 45;


    /* =========================================================
       POSITION DES PUPITRES
    ========================================================= */

    const getPositionPupitre = (index) => {

        const nombrePupitres =
            pupitres.length;

        if (nombrePupitres === 1) {
            return -90;
        }

        const angleDebut = -150;
        const angleFin = -30;

        return (
            angleDebut +
            (
                (angleFin - angleDebut) /
                (nombrePupitres - 1)
            ) *
            index
        );
    };


    /* =========================================================
       POSITION CHANTEUR
    ========================================================= */

    const getPositionChanteur = (
        index,
        total,
        angleCentre
    ) => {

        if (total === 1) {

            const angleRad =
                angleCentre *
                Math.PI /
                180;

            return {
                x:
                    centreX +
                    rayonX *
                    Math.cos(angleRad),

                y:
                    centreY +
                    rayonY *
                    Math.sin(angleRad)
            };
        }


        /*
         * Chaque pupitre occupe une portion
         * de l'arc.
         */
        const largeurAngle = 20;

        const angleDebut =
            angleCentre -
            largeurAngle / 2;

        const angleFin =
            angleCentre +
            largeurAngle / 2;


        const angle =
            angleDebut +
            (
                (angleFin - angleDebut) /
                (total - 1)
            ) *
            index;


        const angleRad =
            angle *
            Math.PI /
            180;


        return {
            x:
                centreX +
                rayonX *
                Math.cos(angleRad),

            y:
                centreY +
                rayonY *
                Math.sin(angleRad)
        };
    };


    return (
        <div
            ref={choeurRef}
            className="representation-choeur"
        >


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="choeur-header">
                <div className="choeur-header-icon">
                    🎵
                </div>

                <div>
                    <h3 className="choeur-title">
                        {titre}
                    </h3>

                    <div className="choeur-subtitle">
                        {totalChanteurs} choriste
                        {totalChanteurs > 1 ? "s" : ""}
                    </div>
                </div>

                <button
                    type="button"
                    className="choeur-fullscreen-button"
                    onClick={basculerPleinEcran}
                    aria-label={
                        pleinEcran
                            ? "Quitter le plein écran"
                            : "Afficher le chœur en plein écran"
                    }
                    title={
                        pleinEcran
                            ? "Quitter le plein écran"
                            : "Afficher en plein écran"
                    }
                    aria-pressed={pleinEcran}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path
                            d={
                                pleinEcran
                                    ? "M9 3v6H3 M15 3v6h6 M3 15h6v6 M21 15h-6v6"
                                    : "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5"
                            }
                        />
                    </svg>
                </button>
            </div>

            {erreurPleinEcran && (
                <p role="alert">
                    {erreurPleinEcran}
                </p>
            )}


            {/* =================================================
                SVG
            ================================================= */}

            <div className="choeur-svg-container">

                <svg
                    className="choeur-svg"
                    viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label={`Représentation du chœur ${titre}`}
                >


                    {/* =========================================
                        ARC
                 

                        <path
                        className="choeur-arc-ligne"
                        d={`
                            M ${centreX - rayonX}
                              ${centreY - rayonY * 0.5}

                            Q ${centreX}
                              ${centreY + 10}

                              ${centreX + rayonX}
                              ${centreY - rayonY * 0.5}
                        `}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    ========================================= */}

                    {/* =========================================
                        PUPITRES
                    ========================================= */}

                    {pupitres.map(
                        (pupitre, pupitreIndex) => {

                            const couleur =
                                pupitre.couleur ||
                                "#64748b";

                            const chanteurs =
                                pupitre.chanteurs || [];

                            const choristes = chanteurs.filter(
                                chanteur => !chanteur.lead
                            );

                            const leads = chanteurs.filter(
                                chanteur => chanteur.lead
                            );
                            const angleCentre =
                                getPositionPupitre(
                                    pupitreIndex
                                );


                            const angleLabelRad =
                                angleCentre *
                                Math.PI /
                                180;


                            /*
                             * Label légèrement au-dessus
                             * des chanteurs.
                             */
                            const labelRayonX = rayonX - 55;
                            const labelRayonY = rayonY - 65;

                            const labelX =
                                centreX +
                                labelRayonX *
                                Math.cos(angleLabelRad);

                            const labelY =
                                centreY +
                                labelRayonY *
                                Math.sin(angleLabelRad);


                            return (
                                <g
                                    key={
                                        pupitre.id ||
                                        pupitre.code ||
                                        pupitreIndex
                                    }
                                >

                                    {/* =================================
                                        LABEL PUPITRE
                                    ================================= */}

                                    <g
                                        className="svg-pupitre-label"
                                        transform={`
                                            translate(
                                                ${labelX},
                                                ${labelY}
                                            )
                                        `}
                                    >

                                        <circle
                                            r="6"
                                            style={{
                                                fill: couleur
                                            }}
                                        />

                                        <text
                                            x="0"
                                            y="-12"
                                            textAnchor="middle"
                                        >
                                            {pupitre.nom}
                                        </text>

                                        <text
                                            className="svg-pupitre-count"
                                            x="0"
                                            y="19"
                                            textAnchor="middle"
                                        >
                                            {chanteurs.length}
                                        </text>

                                    </g>


                                    {/* =================================
                                        CHANTEURS
                                    ================================= */}

                                    {/* Chanteurs sur l’arc du pupitre */}
                                    {choristes.map((chanteur, chanteurIndex) => {
                                        const position = getPositionChanteur(
                                            chanteurIndex,
                                            choristes.length,
                                            angleCentre
                                        );

                                        const nom =
                                            `${chanteur.prenom || ""} ${chanteur.nom || ""}`.trim();

                                        return (
                                            <IconChanteur
                                                key={chanteur.id || chanteurIndex}
                                                x={position.x}
                                                y={position.y}
                                                couleur={couleur}
                                                nom={nom}
                                                index={chanteurIndex}
                                            />
                                        );
                                    })}

                                    {/* Leads entre leur pupitre et le chef */}
                                    {leads.map((chanteur, leadIndex) => {
                                        const positionPupitre = getPositionChanteur(
                                            0,
                                            1,
                                            angleCentre
                                        );

                                        const chefX = centreX;
                                        const chefY = viewBoxHeight - 25;

                                        /*
                                         * Position à mi-chemin entre le pupitre et le chef.
                                         */
                                        const milieuX =
                                            (positionPupitre.x + chefX) / 2;

                                        const milieuY =
                                            (positionPupitre.y + chefY) / 2;

                                        /*
                                         * Plusieurs leads du même pupitre :
                                         * les répartir côte à côte, perpendiculairement
                                         * à la direction pupitre → chef.
                                         */
                                        const dx = chefX - positionPupitre.x;
                                        const dy = chefY - positionPupitre.y;
                                        const distance = Math.hypot(dx, dy) || 1;

                                        const decalage =
                                            (leadIndex - (leads.length - 1) / 2) * 40;

                                        const x =
                                            milieuX + (-dy / distance) * decalage;

                                        const y =
                                            milieuY + (dx / distance) * decalage;

                                        const nom =
                                            `${chanteur.prenom || ""} ${chanteur.nom || ""}`.trim();

                                        return (
                                            <g key={chanteur.id || `lead-${leadIndex}`}>
                                                <IconChanteur
                                                    x={x}
                                                    y={y}
                                                    couleur={couleur}
                                                    nom={`${nom} — Lead`}
                                                    index={leadIndex}
                                                />

                                                <text
                                                    x={x}
                                                    y={y + 29}
                                                    textAnchor="middle"
                                                    fontSize="10"
                                                    fontWeight="700"
                                                    fill={couleur}
                                                >
                                                    Lead
                                                </text>
                                            </g>
                                        );
                                    })}

                                </g>
                            );
                        }
                    )}


                    {/* =========================================
                        CHEF DE CHŒUR
                    ========================================= */}

                    <g
                        className="svg-chef"
                        transform={`
                            translate(
                                ${centreX},
                                ${viewBoxHeight - 25}
                            )
                        `}
                    >

                        <circle r="18" />

                        <text
                            y="5"
                            textAnchor="middle"
                        >
                            🎼
                        </text>

                    </g>

                    <text
                        className="svg-chef-label"
                        x={centreX}
                        y={viewBoxHeight - 2}
                        textAnchor="middle"
                    >
                        Chef de chœur
                    </text>

                </svg>

            </div>


            {/* =================================================
                LÉGENDE
            ================================================= */}

            <div className="choeur-legende">

                {pupitres.map(
                    (pupitre, index) => (

                        <div
                            key={
                                pupitre.id ||
                                pupitre.code ||
                                index
                            }
                            className="legende-item"
                        >

                            <span
                                className="legende-color"
                                style={{
                                    backgroundColor:
                                        pupitre.couleur ||
                                        "#64748b"
                                }}
                            />

                            <span>
                                {pupitre.nom}
                            </span>

                            <span className="legende-count">
                                {pupitre.chanteurs?.length || 0}
                            </span>

                        </div>

                    )
                )}

            </div>

        </div>
    );
}