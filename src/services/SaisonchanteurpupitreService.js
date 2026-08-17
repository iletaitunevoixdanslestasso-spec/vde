import { BaseService } from "./BaseService";

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

        const data = saisonChansons.map(item => {

            const chanson = item.chansons;


            /*
             * Pupitres disponibles pour cette chanson
             */
            const pupitres = (chanson.chanson_pupitres || [])
                .filter(cp => cp.pupitres)
                .map(cp => ({
                    id: cp.pupitre_id,
                    nom: cp.pupitres.nom
                }));


            /*
             * Choix spécifique éventuel
             */
            const choixSpecifique =
                choixParChanson.get(
                    item.chanson_id
                );


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
             *
             * Priorité :
             *
             * 1. choix spécifique
             * 2. pupitre principal s'il est autorisé
             * 3. aucun choix
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


            return {

                chanson_id: chanson.id,

                titre: chanson.titre,

                pupitres,

                pupitreChoisi,

                choixSpecifique: !!choixSpecifique

            };

        });


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