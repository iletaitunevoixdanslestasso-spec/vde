import { BaseResponse } from "../core/framework/BaseResponse";
import { ChansonpupitreRepository } from "../repositories/ChansonpupitreRepository";

import {
    ChanteurPupitresSaisonActiveRepository
} from "../repositories/ChanteurPupitresSaisonActiveRepository";

import {
    SaisonChansonLeadRepository
} from "../repositories/SaisonChansonLeadRepository";
import { SaisonConcertChanteurRepository } from "../repositories/SaisonConcertChanteurRepository";


export default class RepresentationChoeurService {

    constructor() {

        this.repository =
            new ChanteurPupitresSaisonActiveRepository();

        this.leadRepository =
            new SaisonChansonLeadRepository();
        this.saisonConcertChanteurRepository =
            new SaisonConcertChanteurRepository("saison_concert_chanteurs");
        this.chansonPupitreRepository =
            new ChansonpupitreRepository(
                "chanson_pupitres"
            );
    }


    /*
     * =========================================================
     * UNE CHANSON
     * =========================================================
     */

    async getByChanson(
        chansonId,
        saisonConcertId = null
    ) {

        return this.getByChansons(
            [chansonId],
            saisonConcertId
        );
    }


    /*
     * =========================================================
     * PLUSIEURS CHANSONS
     * =========================================================
     */

    async getByChansons(
        chansonIds,
        saisonConcertId = null
    ) {

        if (!chansonIds?.length) {

            return BaseResponse.success({});
        }


        /*
         * ===============================================
         * DONNEES DE REPARTITION
         * ===============================================
         */

        const response =
            await this.repository
                .findByChansons(
                    chansonIds
                );


        if (response.error) {

            return BaseResponse.error(
                {},
                response.error.message
            );
        }


        let rows =
            response.data || [];


        /*
         * ===============================================
         * FILTRE CONCERT
         * ===============================================
         */

        if (saisonConcertId) {

            const participationResponse =
                await this
                    .saisonConcertChanteurRepository
                    .findByConcert(
                        saisonConcertId
                    );


            if (participationResponse.error) {

                return BaseResponse.error(
                    {},
                    participationResponse.error.message
                );
            }


            /*
             * IDs des saison_chanteurs
             * participant réellement au concert.
             */

            const participants =
                new Set(

                    (
                        participationResponse.data ||
                        []
                    )

                        .filter(
                            participation =>
                                participation.participe === true
                        )

                        .map(
                            participation =>
                                participation.saison_chanteur_id
                        )

                );


            /*
             * La vue possède justement :
             *
             * saison_chanteur_id
             *
             * donc le filtre est direct.
             */

            rows =
                rows.filter(
                    row =>
                        participants.has(
                            row.saison_chanteur_id
                        )
                );
        }


        /*
         * ... puis ton traitement actuel
         * des leads et des chansons continue ici
         */

        const saisonId =
            rows[0]?.saison_id;


        const leadsParChanson = {};


        if (saisonId) {

            const leadResponses =
                await Promise.all(

                    chansonIds.map(
                        async chansonId => {

                            const leadResponse =
                                await this.leadRepository
                                    .findBySaisonAndChanson(
                                        saisonId,
                                        chansonId
                                    );

                            return {
                                chansonId,
                                response: leadResponse
                            };
                        }
                    )
                );


            for (const item of leadResponses) {

                if (item.response?.error) {

                    return BaseResponse.error(
                        {},
                        item.response.error.message
                    );
                }


                leadsParChanson[item.chansonId] =
                    new Set(
                        (item.response?.data || []).map(
                            lead =>
                                lead.saison_chanteur_id
                        )
                    );
            }
        }

        const chansonPupitresResponses =
            await Promise.all(

                chansonIds.map(
                    async chansonId => {

                        const response =
                            await this
                                .chansonPupitreRepository
                                .findByChanson(
                                    chansonId
                                );

                        return {
                            chansonId,
                            response
                        };
                    }
                )
            );


        const chansonPupitresParChanson = {};


        for (
            const item
            of chansonPupitresResponses
        ) {

            if (item.response?.error) {

                return BaseResponse.error(
                    {},
                    item.response.error.message
                );
            }


            chansonPupitresParChanson[
                item.chansonId
            ] = (
                item.response?.data || []
            ).sort(
                (a, b) =>
                    (a.ordre ?? 999) -
                    (b.ordre ?? 999)
            );
        }

        const result = {};


        chansonIds.forEach(
            chansonId => {

                const rowsChanson =
                    rows.filter(
                        row =>
                            row.chanson_id === chansonId
                    );


                result[chansonId] =
                    this.buildRepresentation(

                        rowsChanson,

                        leadsParChanson[
                        chansonId
                        ] || new Set(),

                        chansonPupitresParChanson[
                        chansonId
                        ] || []

                    );
            }
        );


        return BaseResponse.success(
            result
        );
    }


    /*
     * =========================================================
     * CONVERSION VUE -> RepresentationChoeur
     * =========================================================
     */

    buildRepresentation_old(
        rows,
        leadIds = new Set()
    ) {

        const first =
            rows[0];


        const pupitresMap =
            new Map();


        rows.forEach(row => {

            /*
             * Pas de pupitre pour ce chanteur.
             */

            if (!row.pupitre_id) {
                return;
            }


            if (
                !pupitresMap.has(
                    row.pupitre_id
                )
            ) {

                pupitresMap.set(
                    row.pupitre_id,
                    {
                        id:
                            row.pupitre_id,

                        nom:
                            row.pupitre_nom ||
                            "Pupitre",

                        chanteurs: []
                    }
                );
            }


            const pupitre =
                pupitresMap.get(
                    row.pupitre_id
                );


            /*
             * Sécurité contre les doublons éventuels.
             */

            const existe =
                pupitre.chanteurs.some(
                    chanteur =>
                        chanteur.id ===
                        row.saison_chanteur_id
                );


            if (!existe) {

                pupitre.chanteurs.push({

                    id:
                        row.saison_chanteur_id,

                    chanteur_id:
                        row.chanteur_id,

                    prenom:
                        row.chanteur_prenom,

                    nom:
                        row.chanteur_nom,

                    lead:
                        leadIds.has(
                            row.saison_chanteur_id
                        )
                });
            }
        });


        /*
         * Tri des pupitres.
         */

        const pupitres =
            Array.from(
                pupitresMap.values()
            ).sort(
                (a, b) =>
                    a.nom.localeCompare(
                        b.nom,
                        "fr"
                    )
            );


        /*
         * Même principe de couleur que ton
         * FormRepartition actuel.
         */

        pupitres.forEach(
            (pupitre, index) => {

                const teinte =
                    pupitres.length > 1

                        ? 60 +
                        (
                            index /
                            (
                                pupitres.length - 1
                            )
                        ) * 220

                        : 60;


                pupitre.couleur =
                    `hsl(${teinte}, 75%, 45%)`;
            }
        );


        return {

            chansonId:
                first?.chanson_id,

            saisonChansonId:
                first?.saison_chanson_id,

            titre:
                first?.chanson_titre ||
                "",

            pupitres
        };
    }
    buildRepresentation(
        rows,
        leadIds = new Set(),
        chansonPupitres = []
    ) {

        const first =
            rows[0];


        /*
         * IMPORTANT :
         *
         * La structure du chœur vient des
         * pupitres autorisés pour LA CHANSON.
         *
         * Elle ne vient PAS des pupitres
         * trouvés chez les chanteurs.
         */

        const pupitres =
            chansonPupitres.map(
                (
                    chansonPupitre,
                    index
                ) => {

                    const pupitreId =
                        chansonPupitre.pupitre_id;


                    const pupitre =
                        chansonPupitre.pupitres;


                    /*
                     * Choristes dont le pupitre effectif
                     * correspond à ce pupitre.
                     *
                     * Si un chanteur est Basse mais que
                     * Basse n'est pas autorisé pour cette
                     * chanson, il n'apparaîtra nulle part.
                     */

                    const chanteursMap =
                        new Map();


                    rows
                        .filter(
                            row =>
                                row.pupitre_id ===
                                pupitreId
                        )
                        .forEach(
                            row => {

                                /*
                                 * Sécurité anti-doublon.
                                 */

                                if (
                                    chanteursMap.has(
                                        row.saison_chanteur_id
                                    )
                                ) {
                                    return;
                                }


                                chanteursMap.set(
                                    row.saison_chanteur_id,
                                    {
                                        id:
                                            row.saison_chanteur_id,

                                        chanteur_id:
                                            row.chanteur_id,

                                        prenom:
                                            row.chanteur_prenom,

                                        nom:
                                            row.chanteur_nom,

                                        lead:
                                            leadIds.has(
                                                row.saison_chanteur_id
                                            )
                                    }
                                );
                            }
                        );


                    const chanteurs =
                        Array.from(
                            chanteursMap.values()
                        );


                    /*
                     * Même calcul de couleur
                     * qu'actuellement.
                     */

                    const teinte =
                        chansonPupitres.length > 1

                            ? 60 +
                            (
                                index /
                                (
                                    chansonPupitres.length -
                                    1
                                )
                            ) * 220

                            : 60;


                    return {

                        id:
                            pupitreId,

                        code:
                            pupitre?.code ||
                            `pupitre-${index}`,

                        nom:
                            pupitre?.nom ||
                            "Pupitre",

                        couleur:
                            `hsl(${teinte}, 75%, 45%)`,

                        chanteurs
                    };
                }
            );


        return {

            chansonId:
                first?.chanson_id,

            saisonChansonId:
                first?.saison_chanson_id,

            titre:
                first?.chanson_titre ||
                "",

            pupitres
        };
    }
}