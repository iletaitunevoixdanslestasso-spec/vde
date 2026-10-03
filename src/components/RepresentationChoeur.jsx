import { useEffect, useRef, useState } from "react";
import "./../styles/representationChoeur.css";
import { useSaison } from "./contexts/SaisonContext";
import { getCouleurGroupe } from "../helper/helper";

function IconChanteur({
    x,
    y,
    couleur,
    groupeId,
    prenom,
    nom,
    groupeNom,
    index,
    highlighted = false,
    onSelect
}) {

    const couleurGroupe = getCouleurGroupe(groupeId, groupeNom)
    const nomComplet =
        `${prenom || ""} ${nom || ""}`.trim();

    return (
        <g
            className={`svg-chanteur ${highlighted
                ? "svg-chanteur-current"
                : ""
                }`}
            transform={`translate(${x}, ${y})`}
            style={{
                color: couleur
            }}
            role="button"
            tabIndex="0"
            onClick={(event) => {
                event.stopPropagation();

                onSelect?.({
                    prenom,
                    nom,
                    groupeNom
                });
            }}
            onKeyDown={(event) => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();

                    onSelect?.({
                        prenom,
                        nom,
                        groupeNom
                    });
                }
            }}
        >

            <title>
                {nomComplet ||
                    `Chanteur ${index + 1}`}
            </title>


            {/* CERCLE = PUPITRE */}
            <circle
                className="svg-chanteur-groupe"
                cx="0"
                cy="0"
                r="19"
                style={{
                    stroke: couleur
                }}
            />


            {/* FOND = PUPITRE */}
            <circle
                className="svg-chanteur-fond"
                cx="0"
                cy="0"
                r="16"
                style={{
                    fill: couleur
                }}
            />


            {/* TÊTE = GROUPE */}
            <circle
                className="svg-chanteur-tete"
                cx="0"
                cy="-6"
                r="5"
                style={{
                    fill: couleurGroupe
                }}
            />


            {/* CORPS = GROUPE */}
            <path
                className="svg-chanteur-corps"
                d="M-9 10 C-9 3 -5 0 0 0 C5 0 9 3 9 10"
                style={{
                    fill: couleurGroupe
                }}
            />


            {highlighted && (
                <text
                    className="svg-chanteur-current-label"
                    x="0"
                    y="-25"
                    textAnchor="middle"
                >
                    Moi
                </text>
            )}

        </g>
    );
}

export default function RepresentationChoeur({
    pupitres = [],
    titre = "Le chœur",
    chanteurId = null
}) {
    const choeurRef = useRef(null);
    const [pleinEcran, setPleinEcran] = useState(false);
    const [erreurPleinEcran, setErreurPleinEcran] = useState("");
    const { saisonSelectionne } = useSaison();


    const svgRef = useRef(null);
    const dragRef = useRef(null);
    const pointersRef = useRef(
        new Map()
    );

    const pinchRef = useRef(null);
    const [zoom, setZoom] = useState(1);

    const [pan, setPan] = useState({
        x: 0,
        y: 0
    });
    const [
        chanteurSelectionne,
        setChanteurSelectionne
    ] = useState(null);

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


    const getPositionPupitre_OLD = (index) => {

        const nombrePupitres = pupitres.length;

        if (nombrePupitres === 1) {
            return -90;
        }


        /*
         * =========================================================
         * OUVERTURE DYNAMIQUE DU CHŒUR
         * =========================================================
         *
         * Petit effectif :
         *
         *          ● ●       ● ●
         *              chef
         *
         * Les pupitres restent proches du centre.
         *
         *
         * Gros effectif :
         *
         * ● ● ● ●               ● ● ● ●
         *
         *              chef
         *
         * L'arc s'ouvre progressivement.
         */

        let ouverture;


        if (totalChanteurs <= 12) {

            /*
             * En petit effectif, on tient aussi compte
             * du nombre de pupitres.
             *
             * 2 pupitres => 40°
             * 3 pupitres => 40°
             * 4 pupitres => 60°
             * 5+         => maximum 70°
             */

            ouverture = Math.min(
                70,
                Math.max(
                    40,
                    (nombrePupitres - 1) * 20
                )
            );

        } else if (totalChanteurs <= 24) {

            ouverture = 80;

        } else if (totalChanteurs <= 50) {

            ouverture = 100;

        } else {

            ouverture = 120;
        }


        /*
         * L'ensemble reste toujours centré sur -90°.
         */

        const angleDebut =
            -90 - ouverture / 2;

        const angleFin =
            -90 + ouverture / 2;


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
         * =========================================================
         * LE PUPITRE TIENT ENTIÈREMENT SUR UN SEUL RANG
         * =========================================================
         *
         * Dans ce cas, inutile de le découper artificiellement
         * en plusieurs rangs.
         *
         * Cela évite notamment :
         *
         * 3 chanteurs -> [1, 1, 1]
         *
         * qui produit une ligne radiale.
         */

        const capaciteUnRang =
            capacitesPremierRangTheoriques[
            pupitreIndex
            ] || 1;


        if (total <= capaciteUnRang) {

            return [total];

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

                if (false) {
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
                }
                const rayon =
                    rayons[rang - 1] +
                    distanceEntreRangs;

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
     * LARGEUR ANGULAIRE D'UN RANG
     * =========================================================
     */

    const getLargeurAngulaireRang = (
        nombreSurRang,
        rayon
    ) => {

        if (nombreSurRang <= 1) {
            return 0;
        }

        const rapport =
            Math.min(
                1,
                distanceMinTokens /
                (2 * rayon)
            );

        const pasAngle =
            2 *
            Math.asin(rapport) *
            180 /
            Math.PI;

        return (
            (nombreSurRang - 1) *
            pasAngle
        );
    };


    /*
     * =========================================================
     * EMPREINTE ANGULAIRE DE CHAQUE PUPITRE
     * =========================================================
     *
     * On cherche le rang le plus large de chaque pupitre.
     */

    const empreintesPupitres =
        effectifsPupitres.map(
            (effectif, pupitreIndex) => {

                const {
                    repartition,
                    rayons
                } =
                    getGeometriePupitre(
                        effectif,
                        pupitreIndex
                    );

                if (!repartition.length) {
                    return 0;
                }

                return Math.max(
                    0,
                    ...repartition.map(
                        (
                            nombreSurRang,
                            rang
                        ) =>
                            getLargeurAngulaireRang(
                                nombreSurRang,
                                rayons[rang] ||
                                rayonPremierRangGlobal
                            )
                    )
                );
            }
        );


    /*
     * =========================================================
     * POSITION DES PUPITRES
     * =========================================================
     */

    const getPositionPupitre = (index) => {

        const nombrePupitres =
            pupitres.length;

        if (nombrePupitres === 1) {
            return -90;
        }


        /*
         * Pour les gros chœurs,
         * on conserve la grande disposition existante.
         */

        if (totalChanteurs > 24) {

            const ouverture =
                totalChanteurs <= 50
                    ? 100
                    : 120;

            const angleDebut =
                -90 - ouverture / 2;

            const angleFin =
                -90 + ouverture / 2;

            return (
                angleDebut +
                (
                    (angleFin - angleDebut) /
                    (nombrePupitres - 1)
                ) *
                index
            );
        }


        /*
         * ---------------------------------------------------------
         * PETIT CHŒUR
         * ---------------------------------------------------------
         *
         * On laisse suffisamment de place entre
         * deux pupitres pour qu'un chanteur puisse
         * tenir entre leurs deux extrémités.
         */

        const rapportSecurite =
            Math.min(
                1,
                distanceMinTokens /
                (2 * rayonPremierRangGlobal)
            );

        const espaceEntrePupitres =
            Math.max(
                10,
                2 *
                Math.asin(rapportSecurite) *
                180 /
                Math.PI
            );


        /*
         * Largeur totale réellement nécessaire.
         */

        const largeurNaturelle =
            empreintesPupitres.reduce(
                (total, largeur) =>
                    total + largeur,
                0
            ) +
            espaceEntrePupitres *
            (nombrePupitres - 1);


        /*
         * On évite qu'un très petit ensemble
         * soit tassé au centre.
         */

        const largeurTotale =
            Math.max(
                40,
                largeurNaturelle
            );


        /*
         * Cas où la largeur naturelle est déjà suffisante :
         * placement basé sur l'encombrement réel.
         */

        if (largeurNaturelle >= 40) {

            let curseur =
                -90 -
                largeurNaturelle / 2;


            for (
                let i = 0;
                i < nombrePupitres;
                i++
            ) {

                const demiLargeur =
                    empreintesPupitres[i] / 2;


                const centre =
                    curseur +
                    demiLargeur;


                if (i === index) {
                    return centre;
                }


                curseur +=
                    empreintesPupitres[i] +
                    espaceEntrePupitres;
            }
        }


        /*
         * Très petit ensemble :
         * répartition régulière sur 40°.
         */

        const angleDebut =
            -90 -
            largeurTotale / 2;

        const angleFin =
            -90 +
            largeurTotale / 2;


        return (
            angleDebut +
            (
                (angleFin - angleDebut) /
                (nombrePupitres - 1)
            ) *
            index
        );
    };

    /*
     * =========================================================
     * VIEWBOX ADAPTATIF
     * =========================================================
     *
     * On recherche le rayon réellement nécessaire pour afficher
     * tous les chanteurs.
     *
     * Le SVG adaptera ensuite automatiquement la taille de tout :
     *
     * - chanteurs
     * - espaces
     * - pupitres
     * - textes
     * - chef
     *
     * Tout reste donc parfaitement proportionnel.
     */

    const rayonsMaxParPupitre =
        effectifsPupitres.map(
            (effectif, pupitreIndex) => {

                const geometrie =
                    getGeometriePupitre(
                        effectif,
                        pupitreIndex
                    );

                if (!geometrie.rayons.length) {
                    return 0;
                }

                return Math.max(
                    ...geometrie.rayons
                );
            }
        );


    const rayonMaxChoeur = Math.max(
        rayonPremierRangGlobal,
        ...rayonsMaxParPupitre
    );


    /*
     * Marge autour du dessin :
     *
     * - pastilles
     * - label "Moi"
     * - nom des pupitres
     * - chef
     */

    const margeScene = 70;


    /*
     * Zone nécessaire pour afficher TOUT le chœur.
     *
     * Elle peut volontairement commencer avec des coordonnées
     * négatives : c'est parfaitement valide dans un SVG.
     */

    const baseViewBox = {

        x:
            chefX -
            rayonMaxChoeur -
            margeScene,

        y:
            chefY -
            rayonMaxChoeur -
            margeScene,

        width:
            (
                rayonMaxChoeur +
                margeScene
            ) * 2,

        height:
            rayonMaxChoeur +
            margeScene +
            60
    };

    /*
     * =========================================================
     * ZOOM
     * =========================================================
     */

    const ZOOM_MIN = 1;
    const ZOOM_MAX = 6;


    const largeurVisible =
        baseViewBox.width / zoom;

    const hauteurVisible =
        baseViewBox.height / zoom;


    /*
     * Au zoom 1 :
     * pan maximum = 0
     *
     * Au zoom > 1 :
     * on peut déplacer la vue.
     */

    const panMaxX =
        (
            baseViewBox.width -
            largeurVisible
        ) / 2;

    const panMaxY =
        (
            baseViewBox.height -
            hauteurVisible
        ) / 2;


    const panX = Math.max(
        -panMaxX,
        Math.min(
            panMaxX,
            pan.x
        )
    );

    const panY = Math.max(
        -panMaxY,
        Math.min(
            panMaxY,
            pan.y
        )
    );


    const visibleViewBox = {

        x:
            baseViewBox.x +
            (
                baseViewBox.width -
                largeurVisible
            ) / 2 +
            panX,

        y:
            baseViewBox.y +
            (
                baseViewBox.height -
                hauteurVisible
            ) / 2 +
            panY,

        width:
            largeurVisible,

        height:
            hauteurVisible
    };


    const modifierZoom = facteur => {

        setZoom(zoomActuel => {

            const nouveauZoom =
                zoomActuel * facteur;

            return Math.max(
                ZOOM_MIN,
                Math.min(
                    ZOOM_MAX,
                    nouveauZoom
                )
            );
        });
    };


    const resetZoom = () => {

        setZoom(1);

        setPan({
            x: 0,
            y: 0
        });
    };

    {
        const commencerDeplacement_old = event => {

            if (zoom <= 1) {
                return;
            }

            event.currentTarget.setPointerCapture?.(
                event.pointerId
            );

            dragRef.current = {

                pointerId:
                    event.pointerId,

                clientX:
                    event.clientX,

                clientY:
                    event.clientY,

                panX,

                panY
            };
        };


        const deplacerVue_old = event => {

            const drag = dragRef.current;

            if (
                !drag ||
                drag.pointerId !== event.pointerId ||
                !svgRef.current
            ) {
                return;
            }


            const rect =
                svgRef.current.getBoundingClientRect();


            const deltaX =
                (
                    event.clientX -
                    drag.clientX
                ) *
                visibleViewBox.width /
                rect.width;


            const deltaY =
                (
                    event.clientY -
                    drag.clientY
                ) *
                visibleViewBox.height /
                rect.height;


            setPan({

                x:
                    drag.panX -
                    deltaX,

                y:
                    drag.panY -
                    deltaY
            });
        };


        const terminerDeplacement_old = event => {

            if (
                dragRef.current?.pointerId ===
                event.pointerId
            ) {
                dragRef.current = null;
            }
        };
    }

    const getDistancePointers = (
        pointer1,
        pointer2
    ) => {

        return Math.hypot(
            pointer2.x - pointer1.x,
            pointer2.y - pointer1.y
        );
    };


    const commencerInteraction = event => {

        event.currentTarget
            .setPointerCapture?.(
                event.pointerId
            );


        /*
         * Mémorise le doigt / pointeur.
         */

        pointersRef.current.set(
            event.pointerId,
            {
                x: event.clientX,
                y: event.clientY
            }
        );


        /*
         * ===============================================
         * DEUX DOIGTS
         * ===============================================
         *
         * On commence un pinch.
         */

        if (
            pointersRef.current.size === 2
        ) {

            const pointers =
                Array.from(
                    pointersRef.current.values()
                );


            const distance =
                getDistancePointers(
                    pointers[0],
                    pointers[1]
                );


            pinchRef.current = {

                distance,

                zoom
            };


            /*
             * On annule le drag éventuel
             * commencé avec le premier doigt.
             */

            dragRef.current = null;

            return;
        }


        /*
         * ===============================================
         * UN DOIGT
         * ===============================================
         *
         * Déplacement uniquement si zoomé.
         */

        if (zoom <= 1) {
            return;
        }


        dragRef.current = {

            pointerId:
                event.pointerId,

            clientX:
                event.clientX,

            clientY:
                event.clientY,

            panX,

            panY
        };
    };


    const deplacerInteraction = event => {

        /*
         * Met à jour la position
         * du pointeur courant.
         */

        if (
            pointersRef.current.has(
                event.pointerId
            )
        ) {

            pointersRef.current.set(
                event.pointerId,
                {
                    x: event.clientX,
                    y: event.clientY
                }
            );
        }


        /*
         * ===============================================
         * PINCH ZOOM
         * ===============================================
         */

        if (
            pointersRef.current.size >= 2 &&
            pinchRef.current
        ) {

            const pointers =
                Array.from(
                    pointersRef.current.values()
                );


            const distanceActuelle =
                getDistancePointers(
                    pointers[0],
                    pointers[1]
                );


            if (
                pinchRef.current.distance <= 0
            ) {
                return;
            }


            const facteur =
                distanceActuelle /
                pinchRef.current.distance;


            const nouveauZoom =
                Math.max(
                    ZOOM_MIN,
                    Math.min(
                        ZOOM_MAX,

                        pinchRef.current.zoom *
                        facteur
                    )
                );


            setZoom(
                nouveauZoom
            );


            /*
             * Retour exact à la vue initiale.
             */

            if (
                nouveauZoom <= ZOOM_MIN
            ) {

                setPan({
                    x: 0,
                    y: 0
                });
            }


            return;
        }


        /*
         * ===============================================
         * DEPLACEMENT A UN DOIGT
         * ===============================================
         */

        const drag =
            dragRef.current;


        if (
            !drag ||
            drag.pointerId !==
            event.pointerId ||
            !svgRef.current
        ) {

            return;
        }


        const rect =
            svgRef.current
                .getBoundingClientRect();


        const deltaX =
            (
                event.clientX -
                drag.clientX
            ) *
            visibleViewBox.width /
            rect.width;


        const deltaY =
            (
                event.clientY -
                drag.clientY
            ) *
            visibleViewBox.height /
            rect.height;


        setPan({

            x:
                drag.panX -
                deltaX,

            y:
                drag.panY -
                deltaY

        });
    };


    const terminerInteraction = event => {

        /*
         * Supprime le doigt/pointeur.
         */

        pointersRef.current.delete(
            event.pointerId
        );


        /*
         * Fin du pinch.
         */

        if (
            pointersRef.current.size < 2
        ) {

            pinchRef.current = null;
        }


        /*
         * Fin du drag.
         */

        if (
            dragRef.current?.pointerId ===
            event.pointerId
        ) {

            dragRef.current = null;
        }


        if (
            event.currentTarget
                .hasPointerCapture?.(
                    event.pointerId
                )
        ) {

            event.currentTarget
                .releasePointerCapture?.(
                    event.pointerId
                );
        }
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

            {
                erreurPleinEcran && (
                    <p role="alert">
                        {erreurPleinEcran}
                    </p>
                )
            }


            {/* =================================================
                SVG
            ================================================= */}

            <div className="choeur-svg-container" onClick={() =>
                setChanteurSelectionne(null)
            }>

                <div
                    className="choeur-zoom-controls"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        className="choeur-zoom-trigger"
                        title="Zoom"
                        aria-label="Afficher les contrôles de zoom"
                    >
                        <span
                            className="icon-loupe"
                            aria-hidden="true"
                        />
                    </button>

                    <div className="choeur-zoom-panel">

                        <button
                            type="button"
                            onClick={() =>
                                modifierZoom(1 / 1.25)
                            }
                            disabled={zoom <= ZOOM_MIN}
                            title="Dézoomer"
                        >
                            −
                        </button>

                        <button
                            type="button"
                            onClick={resetZoom}
                            title="Afficher tout le chœur"
                            className="choeur-zoom-value"
                        >
                            {Math.round(zoom * 100)} %
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                modifierZoom(1.25)
                            }
                            disabled={zoom >= ZOOM_MAX}
                            title="Zoomer"
                        >
                            +
                        </button>

                    </div>

                </div>

                {chanteurSelectionne && (

                    <div
                        className="choeur-chanteur-info"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <button
                            type="button"
                            className="choeur-chanteur-info-close"
                            onClick={() =>
                                setChanteurSelectionne(null)
                            }
                            aria-label="Fermer"
                        >
                            ×
                        </button>


                        <div className="choeur-chanteur-info-nom">

                            {chanteurSelectionne.prenom}

                            {" "}

                            {chanteurSelectionne.nom}

                        </div>


                        <div className="choeur-chanteur-info-groupe">

                            Groupe :{" "}

                            <strong>
                                {chanteurSelectionne.groupeNom}
                            </strong>

                        </div>

                    </div>

                )}


                <svg
                    ref={svgRef}

                    className={`choeur-svg ${zoom > 1
                        ? "choeur-svg-zoomed"
                        : ""
                        }`}

                    viewBox={`
                        ${visibleViewBox.x}
                        ${visibleViewBox.y}
                        ${visibleViewBox.width}
                        ${visibleViewBox.height}
                    `}

                    preserveAspectRatio="xMidYMid meet"

                    role="img"

                    aria-label={`Représentation du chœur ${titre}`}
                    /*{

                        onPointerDown={commencerDeplacement}
                        onPointerMove={deplacerVue}
                        onPointerUp={terminerDeplacement}
                        onPointerCancel={terminerDeplacement}
                    }*/
                    onPointerDown={
                        commencerInteraction
                    }

                    onPointerMove={
                        deplacerInteraction
                    }

                    onPointerUp={
                        terminerInteraction
                    }

                    onPointerCancel={
                        terminerInteraction
                    }

                >



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

                                                groupeId={
                                                    chanteur.groupe_id
                                                }

                                                prenom={chanteur.prenom}
                                                nom={chanteur.nom}

                                                groupeNom={
                                                    chanteur.groupe_nom
                                                }

                                                index={chanteurIndex}

                                                highlighted={
                                                    chanteur.chanteur_id ===
                                                    chanteurId
                                                }

                                                onSelect={
                                                    setChanteurSelectionne
                                                }
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

                                        // const chefX = centreX;
                                        // const chefY = viewBoxHeight - 55;

                                        /*
                                         * Position à mi-chemin entre le pupitre et le chef.
                                         */
                                        // 0 = au pupitre ; 1 = au chef.
                                        const progressionVersChef = 0.65;

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
                                            (leadIndex - (leads.length - 1) / 2) * 30;

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

                                                    groupeId={
                                                        chanteur.groupe_id
                                                    }

                                                    prenom={chanteur.prenom}
                                                    nom={chanteur.nom}

                                                    groupeNom={
                                                        chanteur.groupe_nom
                                                    }

                                                    index={leadIndex}

                                                    highlighted={
                                                        chanteur.chanteur_id ===
                                                        chanteurId
                                                    }

                                                    onSelect={
                                                        setChanteurSelectionne
                                                    }
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
                                ${chefX},
                                ${chefY}
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
                        y={chefY + 23}
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

        </div >
    );
}