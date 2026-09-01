import { BaseService } from "./BaseService";
import StorageService from "./StorageService";

export class SaisonChanteurPupitreService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
    }


    /**
     * Récupère les chansons de la saison.
     *
     * Pour chaque chanson :
     *
     * 1. choix spécifique du chanteur s'il existe
     * 2. sinon pupitre principal de la saison
     */
/**
 * Récupère les chansons de la saison.
 *
 * Pour chaque chanson :
 *
 * 1. choix spécifique du chanteur s'il existe
 * 2. sinon pupitre principal de la saison
 * 3. récupération sécurisée des paroles
 */
async getMesChansons(token, saisonId, chanteurId) {

    const [
        saisonChansons,
        mesPupitres
    ] = await Promise.all([

        this.repository.findChansonsAvecPupitres(
            saisonId
        ),

        this.repository.findBySaisonAndChanteur(
            token,
            saisonId,
            chanteurId
        )

    ]);

    /*
     * =====================================================
     * Pupitre principal du chanteur
     *
     * chanson_id = NULL
     * principal = true
     * =====================================================
     */

    const pupitrePrincipal =
        mesPupitres.find(
            item =>
                item.chanson_id === null &&
                item.principal === true
        );


    /*
     * =====================================================
     * Choix spécifiques par chanson
     * =====================================================
     */

    const choixParChanson = new Map();

    mesPupitres
        .filter(item => item.chanson_id !== null)
        .forEach(item => {

            choixParChanson.set(
                item.chanson_id,
                item
            );

        });


    /*
     * =====================================================
     * Construction des chansons
     * =====================================================
     */

    console.log(
        "SAISON CHANSONS",
        saisonChansons
    );

    saisonChansons.forEach(item => {

        if (!item.chansons) {

            console.warn(
                "⚠️ chanson introuvable pour saison_chansons :",
                item
            );

        }

    });


    const data = await Promise.all(

        saisonChansons.map(async item => {

            const chanson = item.chansons;

            /*
             * =================================================
             * Paroles
             *
             * L'accès passe par l'Edge Function
             * get-chanteur-chanson-paroles
             * =================================================
             */

            let documentUrl = null;
            let documentPath = null;

            if (chanson?.id) {

                try {

                    const paroles =
                        await StorageService.getChansonParoles(
                            token,
                            chanson.id
                        );

                    documentUrl =
                        paroles?.url || null;

                    documentPath =
                        paroles?.path || null;

                } catch (error) {

                    console.error(
                        "Erreur récupération paroles chanson",
                        chanson.id,
                        error
                    );

                }

            }


            /*
             * =================================================
             * Pupitres disponibles pour cette chanson
             * =================================================
             */

            const pupitres = Array.from(
                new Map(

                    (chanson?.chanson_pupitres || [])

                        .filter(
                            cp => cp.pupitres
                        )

                        .map(cp => [

                            cp.pupitre_id,

                            {
                                ...cp,
                                id: cp.pupitre_id,
                                nom: cp.pupitres.nom
                            }

                        ])

                ).values()
            );


            /*
             * =================================================
             * Choix spécifique éventuel
             * =================================================
             */

            const choixSpecifique =
                choixParChanson.get(
                    item.chanson_id
                );


            /*
             * =================================================
             * Vérifier si le pupitre principal
             * est disponible pour cette chanson
             * =================================================
             */

            const principalAutorise =
                pupitrePrincipal &&
                pupitres.some(
                    pupitre =>
                        pupitre.id ===
                        pupitrePrincipal.pupitre_id
                );


            /*
             * =================================================
             * Déterminer le pupitre affiché
             * =================================================
             */

            let pupitreChoisi = null;

            if (choixSpecifique) {

                pupitreChoisi = {

                    id: choixSpecifique.id,

                    pupitre_id:
                        choixSpecifique.pupitre_id,

                    principal: false

                };

            }
            else if (principalAutorise) {

                pupitreChoisi = {

                    id: pupitrePrincipal.id,

                    pupitre_id:
                        pupitrePrincipal.pupitre_id,

                    principal: true

                };

            }


            /*
             * =================================================
             * Audio correspondant au pupitre choisi
             * =================================================
             */

            let audio_pupitre = null;

            if (pupitreChoisi) {

                audio_pupitre =
                    pupitres.find(
                        pupitre =>
                            pupitre.pupitre_id ===
                            pupitreChoisi.pupitre_id
                    );

            }


            /*
             * =================================================
             * Résultat de la chanson
             * =================================================
             */

            return {

                chanson_id:
                    chanson.id,

                titre:
                    chanson.titre,

                documentUrl,

                path:
                    documentPath,

                audio_pupitre,

                pupitres,

                pupitreChoisi,

                choixSpecifique:
                    !!choixSpecifique

            };

        })
    );


    /*
     * =====================================================
     * Résultat final
     * =====================================================
     */

    return {

        success: true,

        data

    };
}
    async getMesChansons_old(token, saisonId, chanteurId) {

        const [
            saisonChansons,
            mesPupitres
        ] = await Promise.all([

            this.repository.findChansonsAvecPupitres(
                saisonId
            ),

            this.repository.findBySaisonAndChanteur(
                token,
                saisonId,
                chanteurId
            )

        ]);


        /*
         * Pupitre principal du chanteur
         *
         * chanson_id = NULL
         * principal = true
         */
        const pupitrePrincipal =
            mesPupitres.find(
                item =>
                    item.chanson_id === null &&
                    item.principal === true
            );


        /*
         * Choix spécifiques par chanson
         */
        const choixParChanson = new Map();

        mesPupitres
            .filter(item => item.chanson_id !== null)
            .forEach(item => {

                choixParChanson.set(
                    item.chanson_id,
                    item
                );

            });





        /*
         * Construction des chansons
         */
        console.log("SAISON CHANSONS", saisonChansons);

        saisonChansons.forEach(item => {
            if (!item.chansons) {
                console.warn(
                    "⚠️ chanson introuvable pour saison_chansons :",
                    item
                );
            }
        });

        const data = await Promise.all(
            saisonChansons.map(async item => {

                const chanson = item.chansons;

                /*
                 * Document de la chanson
                 */
                const document = chanson.referentiel_documents;

                let documentUrl = null;

                if (document?.path) {

                    documentUrl =
                        await StorageService.createSignedUrl(
                            "referentiel-documents",
                            document.path,
                            3600
                        );

                    console.log("url", documentUrl);
                }

                /*
                 * Pupitres disponibles pour cette chanson
                 */
                // const pupitres = (chanson.chanson_pupitres || [])
                //     .filter(cp => cp.pupitres)
                //     .map(cp => ({
                //         ...cp,
                //         id: cp.pupitre_id,
                //         nom: cp.pupitres.nom
                //     }));
                const pupitres = Array.from(
                    new Map(
                        (chanson.chanson_pupitres || [])
                            .filter(cp => cp.pupitres)
                            .map(cp => [
                                cp.pupitre_id,
                                {
                                    ...cp,
                                    id: cp.pupitre_id,
                                    nom: cp.pupitres.nom
                                }
                            ])
                    ).values()
                );

                /*
                 * Choix spécifique éventuel
                 */
                const choixSpecifique =
                    choixParChanson.get(item.chanson_id);

                /*
                 * Vérifier si le pupitre principal
                 * est disponible pour cette chanson.
                 */
                const principalAutorise =
                    pupitrePrincipal &&
                    pupitres.some(
                        pupitre =>
                            pupitre.id ===
                            pupitrePrincipal.pupitre_id
                    );

                /*
                 * Déterminer le pupitre affiché
                 */
                let pupitreChoisi = null;

                if (choixSpecifique) {

                    pupitreChoisi = {
                        id: choixSpecifique.id,
                        pupitre_id: choixSpecifique.pupitre_id,
                        principal: false
                    };

                }
                else if (principalAutorise) {

                    pupitreChoisi = {
                        id: pupitrePrincipal.id,
                        pupitre_id: pupitrePrincipal.pupitre_id,
                        principal: true
                    };
                }
                /**
                 * audio du pupitre chsois
                */
                let audio_pupitre = null;
                if (pupitreChoisi)
                    audio_pupitre = pupitres.find(item => item.pupitre_id === pupitreChoisi.pupitre_id)

                return {

                    chanson_id: chanson.id,

                    titre: chanson.titre,

                    documentUrl,
                    path: document?.path,
                    audio_pupitre,
                    pupitres,

                    pupitreChoisi,

                    choixSpecifique: !!choixSpecifique

                };

            })
        );


        return {
            success: true,
            data
        };
    }


    /**
     * Enregistre le pupitre choisi pour une chanson.
     */
    async savePupitre(
        token,
        saisonId,
        chanteurId,
        chansonId,
        pupitreId
    ) {

        try {

            const result =
                await this.repository.savePupitre(
                    token,
                    saisonId,
                    chanteurId,
                    chansonId,
                    pupitreId
                );

            return {
                success: true,
                data: result.data
            };

        } catch (error) {

            console.error(
                "Erreur savePupitre",
                error
            );

            return {
                success: false,
                errors: [
                    error.message ||
                    "Impossible d'enregistrer le pupitre."
                ]
            };
        }
    }
}