import { useEffect, useRef, useState } from "react";
import "./../styles/representationChoeur.css";
import { useSaison } from "./contexts/SaisonContext";

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
    const { saisonSelectionne } = useSaison();


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
        440,
        Math.max(
            260,
            185 + totalChanteurs * 12
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
    /*
     * =========================================================
     * ORDRE DES PUPITRES DEPUIS LE CENTRE
     * =========================================================
     *
     * 5 pupitres :
     *
     * 0  1  2  3  4
     *       ↑
     *
     * ordre : 2, 1, 3, 0, 4
     *
     *
     * 4 pupitres :
     *
     * 0  1  2  3
     *    ↑  ↑
     *
     * ordre : 1, 2, 0, 3
     */

    const ordrePupitresDepuisCentre = (() => {

        const centre =
            (pupitres.length - 1) / 2;

        return pupitres
            .map((_, index) => index)
            .sort((a, b) => {

                const distanceA =
                    Math.abs(a - centre);

                const distanceB =
                    Math.abs(b - centre);

                if (distanceA !== distanceB) {
                    return distanceA - distanceB;
                }

                return a - b;
            });

    })();


    /*
     * =========================================================
     * CAPACITE DU PREMIER RANG
     * =========================================================
     *
     * On détermine approximativement combien de chanteurs
     * peuvent tenir sur le premier arc sans se chevaucher.
     *
     * 44 correspond environ à :
     *
     * diamètre token + espace de sécurité.
     */

    /*
     * =========================================================
     * CAPACITE GLOBALE DU PREMIER RANG
     * =========================================================
     */

    const largeurPremierRang =
        rayonX * 1.73;

    const espaceMinimumToken = 44;

    const capacitePremierRangGlobale =
        Math.max(
            pupitres.length,
            Math.floor(
                largeurPremierRang /
                espaceMinimumToken
            ) + 1
        );


    /*
     * =========================================================
     * CAPACITE THEORIQUE PAR PUPITRE
     * =========================================================
     *
     * Cette répartition sert uniquement à déterminer
     * combien de chanteurs nous voulons AU TOTAL
     * sur le premier rang.
     */

    const capacitesPremierRangTheoriques = (() => {

        const nombrePupitres =
            pupitres.length;

        const capacites =
            Array(nombrePupitres).fill(
                Math.floor(
                    capacitePremierRangGlobale /
                    nombrePupitres
                )
            );

        let surplus =
            capacitePremierRangGlobale %
            nombrePupitres;

        let i = 0;

        while (surplus > 0) {

            const pupitreIndex =
                ordrePupitresDepuisCentre[i];

            capacites[pupitreIndex]++;

            surplus--;
            i++;
        }

        return capacites;
    })();


    /*
     * =========================================================
     * EFFECTIFS REELS PAR PUPITRE
     * =========================================================
     *
     * Les leads ne font pas partie des rangs normaux.
     */

    const effectifsPupitres =
        pupitres.map(
            pupitre =>
                (pupitre.chanteurs || [])
                    .filter(
                        chanteur =>
                            !chanteur.lead
                    )
                    .length
        );


    /*
     * =========================================================
     * REPARTITION PRELIMINAIRE
     * =========================================================
     *
     * Cette fonction reproduit le principe précédent.
     *
     * Elle sert uniquement à savoir combien de chanteurs
     * seraient naturellement placés au premier rang.
     */

    const getRepartitionPreliminaire = (
        total,
        capacitePremierRang
    ) => {

        if (total <= 0) {
            return [];
        }

        const nombreRangs =
            Math.min(
                4,
                Math.max(
                    1,
                    Math.ceil(
                        total /
                        Math.max(
                            1,
                            capacitePremierRang
                        )
                    )
                )
            );

        const base =
            Math.floor(
                total /
                nombreRangs
            );

        const surplus =
            total %
            nombreRangs;

        return Array.from(
            {
                length: nombreRangs
            },
            (_, rang) =>
                base +
                (
                    rang >=
                        nombreRangs - surplus
                        ? 1
                        : 0
                )
        );
    };


    /*
     * =========================================================
     * NOMBRE TOTAL DE CHANTEURS AU PREMIER RANG
     * =========================================================
     *
     * Exemple actuel :
     *
     * Alti     = 3
     * Alto 2   = 3
     * Ténor    = 4
     * Soprano  = 2
     *
     * Total = 12
     *
     * On conserve 12,
     * mais on va maintenant les redistribuer équitablement.
     */

    const totalPremierRang = effectifsPupitres.reduce(
        (total, effectif, index) => {

            const repartition =
                getRepartitionPreliminaire(
                    effectif,
                    capacitesPremierRangTheoriques[
                    index
                    ] || 1
                );

            return (
                total +
                (repartition[0] || 0)
            );
        },
        0
    );


    /*
     * =========================================================
     * REPARTITION EQUITABLE DU PREMIER RANG
     * =========================================================
     *
     * Priorités :
     *
     * 1. même nombre par pupitre autant que possible
     *
     * 2. surplus au centre
     *
     * 3. puis on s'éloigne du centre
     *
     *
     * Exemple :
     *
     * 12 places / 4 pupitres
     *
     *      3   3   3   3
     *
     *
     * Exemple :
     *
     * 14 places / 4 pupitres
     *
     *      3   4   4   3
     */

    const chanteursPremierRangParPupitre = (() => {

        const nombrePupitres =
            pupitres.length;

        if (!nombrePupitres) {
            return [];
        }

        /*
         * Base commune.
         */

        const base =
            Math.floor(
                totalPremierRang /
                nombrePupitres
            );

        /*
         * On ne peut évidemment pas mettre
         * davantage de chanteurs que le pupitre
         * n'en possède.
         */

        const resultat =
            effectifsPupitres.map(
                effectif =>
                    Math.min(
                        base,
                        effectif
                    )
            );


        let placesDistribuees =
            resultat.reduce(
                (total, valeur) =>
                    total + valeur,
                0
            );


        let reste =
            totalPremierRang -
            placesDistribuees;


        /*
         * Le surplus part du centre,
         * puis s'éloigne progressivement.
         */

        while (reste > 0) {

            let distributionEffectuee =
                false;

            for (
                const pupitreIndex
                of ordrePupitresDepuisCentre
            ) {

                if (reste <= 0) {
                    break;
                }


                /*
                 * Le pupitre doit encore posséder
                 * un chanteur disponible.
                 */

                if (
                    resultat[pupitreIndex] <
                    effectifsPupitres[pupitreIndex]
                ) {

                    resultat[pupitreIndex]++;

                    reste--;

                    distributionEffectuee =
                        true;
                }
            }


            /*
             * Sécurité :
             * impossible de distribuer davantage.
             */

            if (!distributionEffectuee) {
                break;
            }
        }


        return resultat;
    })();


    /*
     * =========================================================
     * REPARTITION DEFINITIVE DES RANGS D'UN PUPITRE
     * =========================================================
     */

    const getRepartitionRangs = (
        total,
        pupitreIndex
    ) => {

        if (total <= 0) {
            return [];
        }


        /*
         * Premier rang imposé par la
         * répartition globale du chœur.
         */

        let premierRang =
            Math.min(
                chanteursPremierRangParPupitre[
                pupitreIndex
                ] || 1,
                total
            );


        /*
         * Il reste les chanteurs à mettre derrière.
         */

        let restant =
            total -
            premierRang;


        if (restant <= 0) {
            return [premierRang];
        }


        /*
         * Règle :
         *
         * derrière >= devant
         *
         * Si le premier rang est exceptionnellement
         * trop gros par rapport au petit effectif
         * du pupitre, on le réduit.
         *
         * Cela n'arrive normalement pas avec
         * tes effectifs actuels.
         */

        if (restant < premierRang) {

            premierRang =
                Math.floor(
                    total / 2
                );

            restant =
                total -
                premierRang;
        }


        /*
         * Maximum 4 rangs au total,
         * donc maximum 3 rangs derrière.
         *
         * Chaque rang derrière doit contenir
         * au moins autant de monde
         * que le premier.
         */

        const nombreRangsArriere =
            Math.min(
                3,
                Math.max(
                    1,
                    Math.floor(
                        restant /
                        Math.max(
                            1,
                            premierRang
                        )
                    )
                )
            );


        const baseArriere =
            Math.floor(
                restant /
                nombreRangsArriere
            );


        const surplusArriere =
            restant %
            nombreRangsArriere;


        /*
         * Le surplus va vers les rangs
         * les plus éloignés du chef.
         *
         * On garantit donc :
         *
         * rang 1 <= rang 2 <= rang 3 <= rang 4
         */

        const rangsArriere =
            Array.from(
                {
                    length:
                        nombreRangsArriere
                },
                (_, rang) =>
                    baseArriere +
                    (
                        rang >=
                            nombreRangsArriere -
                            surplusArriere
                            ? 1
                            : 0
                    )
            );


        return [
            premierRang,
            ...rangsArriere
        ];
    };


    /*
     * =========================================================
     * GEOMETRIE GENERALE
     * =========================================================
     */

    const chefX =
        centreX;

    const chefY =
        viewBoxHeight - 25;


    /*
     * Token :
     *
     * r = 16
     * diamètre = 32
     *
     * 42 donne une petite marge.
     */

    const distanceMinTokens = 42;

    const distanceEntreRangs = 44;

    const rayonPremierRangBase = 210;

    const distanceMarqueurPremierRang = 62;


    const nombrePupitres =
        pupitres.length;


    const ecartAnglePupitres =
        nombrePupitres > 1
            ? 120 /
            (nombrePupitres - 1)
            : 100;


    const largeurSecteurPupitre =
        nombrePupitres > 1
            ? ecartAnglePupitres * 0.70
            : 70;


    /*
     * =========================================================
     * RAYON MINIMUM POUR FAIRE TENIR N CHANTEURS
     * =========================================================
     */

    const getRayonMinimumPourRang = (
        nombreSurRang
    ) => {

        if (nombreSurRang <= 1) {
            return 0;
        }


        const pasAngleMaximum =
            largeurSecteurPupitre /
            (nombreSurRang - 1);


        const pasAngleMaximumRad =
            pasAngleMaximum *
            Math.PI /
            180;


        return (
            distanceMinTokens /
            (
                2 *
                Math.sin(
                    pasAngleMaximumRad / 2
                )
            )
        );
    };


    /*
     * =========================================================
     * RAYON COMMUN DU PREMIER RANG
     * =========================================================
     *
     * Tous les pupitres ont leur premier rang
     * sur EXACTEMENT le même cercle.
     */

    const maximumPremierRang =
        Math.max(
            1,
            ...chanteursPremierRangParPupitre
        );


    const rayonPremierRangGlobal =
        Math.max(
            rayonPremierRangBase,
            getRayonMinimumPourRang(
                maximumPremierRang
            )
        );


    /*
     * =========================================================
     * GEOMETRIE D'UN PUPITRE
     * =========================================================
     */

    const getGeometriePupitre = (
        total,
        pupitreIndex
    ) => {

        const repartition =
            getRepartitionRangs(
                total,
                pupitreIndex
            );


        const rayons = [];


        repartition.forEach(
            (
                nombreSurRang,
                rang
            ) => {

                /*
                 * PREMIER RANG :
                 *
                 * rayon strictement identique
                 * pour tous les pupitres.
                 */

                if (rang === 0) {

                    rayons.push(
                        rayonPremierRangGlobal
                    );

                    return;
                }


                /*
                 * Rang suivant :
                 *
                 * on s'éloigne du chef.
                 */

                const rayonTheorique =
                    rayonPremierRangGlobal +
                    rang *
                    distanceEntreRangs;


                /*
                 * Si beaucoup de chanteurs,
                 * le rayon peut être encore augmenté.
                 */

                const rayonMinimum =
                    getRayonMinimumPourRang(
                        nombreSurRang
                    );


                const rayon =
                    Math.max(
                        rayonTheorique,
                        rayonMinimum,
                        rayons[rang - 1] +
                        distanceEntreRangs
                    );


                rayons.push(
                    rayon
                );
            }
        );


        /*
         * Le marqueur du pupitre est également
         * sur un rayon GLOBAL identique.
         */

        const rayonMarqueur =
            rayonPremierRangGlobal -
            distanceMarqueurPremierRang;


        return {
            repartition,
            rayons,
            rayonMarqueur
        };
    };


    /*
     * =========================================================
     * POSITION D'UN CHANTEUR
     * =========================================================
     */

    const getPositionChanteur = (
        index,
        total,
        angleCentre,
        pupitreIndex
    ) => {

        const {
            repartition,
            rayons
        } = getGeometriePupitre(
            total,
            pupitreIndex
        );


        /*
         * Trouver son rang.
         */

        let rang = 0;

        let debutRang = 0;


        while (
            rang < repartition.length &&
            index >=
            debutRang +
            repartition[rang]
        ) {

            debutRang +=
                repartition[rang];

            rang++;
        }


        const nombreSurRang =
            repartition[rang] || 1;


        const indexDansRang =
            index -
            debutRang;


        const rayonRang =
            rayons[rang] ||
            rayonPremierRangGlobal;


        /*
         * =========================================================
         * DISTANCE ANGULAIRE ENTRE TOKENS
         * =========================================================
         */

        let pasAngle = 0;


        if (nombreSurRang > 1) {

            const rapport =
                Math.min(
                    1,
                    distanceMinTokens /
                    (2 * rayonRang)
                );


            const pasAngleRad =
                2 *
                Math.asin(
                    rapport
                );


            pasAngle =
                pasAngleRad *
                180 /
                Math.PI;
        }


        /*
         * =========================================================
         * CENTRAGE
         * =========================================================
         */

        let positionDansRang =
            indexDansRang -
            (nombreSurRang - 1) / 2;


        /*
         * =========================================================
         * QUINCONCE
         * =========================================================
         *
         * Premier rang :
         *
         *       ●   ●   ●
         *
         * Deuxième rang :
         *
         *         ●   ●   ●
         *
         * etc.
         */

        if (rang % 2 === 1) {

            if (angleCentre < -90) {

                positionDansRang += 0.5;

            } else if (angleCentre > -90) {

                positionDansRang -= 0.5;

            } else {

                positionDansRang += 0.5;
            }
        }


        /*
         * =========================================================
         * POSITION FINALE
         * =========================================================
         */

        const angle =
            angleCentre +
            positionDansRang *
            pasAngle;


        const angleRad =
            angle *
            Math.PI /
            180;


        return {

            x:
                chefX +
                rayonRang *
                Math.cos(angleRad),

            y:
                chefY +
                rayonRang *
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
                            /*
                             * =========================================================
                             * MARQUEUR DU PREMIER RANG
                             * =========================================================
                             */

                            const {
                                rayonMarqueur
                            } = getGeometriePupitre(
                                choristes.length,
                                pupitreIndex
                            );


                            const labelX =
                                chefX +
                                rayonMarqueur *
                                Math.cos(angleLabelRad);


                            const labelY =
                                chefY +
                                rayonMarqueur *
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
                                            angleCentre,
                                            pupitreIndex
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
                                            angleCentre,
                                            pupitreIndex
                                        );

                                        const chefX = centreX;
                                        const chefY = viewBoxHeight - 25;

                                        /*
                                         * Position à mi-chemin entre le pupitre et le chef.
                                         */
                                        // 0 = au pupitre ; 1 = au chef.
                                        const progressionVersChef = 0.6;

                                        const milieuX =
                                            positionPupitre.x +
                                            (chefX - positionPupitre.x) * progressionVersChef;

                                        const milieuY =
                                            positionPupitre.y +
                                            (chefY - positionPupitre.y) * progressionVersChef;

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
                        {saisonSelectionne?.chef_choeur?.prenom}
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