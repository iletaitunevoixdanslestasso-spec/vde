import { BaseResponse } from "../core/framework/BaseResponse";

export default class RepartitionService {

    constructor(
        chansonPupitreRepository,
        saisonChanteurRepository,
        saisonChanteurPupitreRepository
    ) {
        this.chansonPupitreRepository =
            chansonPupitreRepository;

        this.saisonChanteurRepository =
            saisonChanteurRepository;

        this.saisonChanteurPupitreRepository =
            saisonChanteurPupitreRepository;
    }


    async getRepartition(chansonId, saisonId) {

        const [
            chansonPupitresResponse,
            saisonChanteursResponse,
            saisonChanteurPupitresResponse
        ] = await Promise.all([

            this.chansonPupitreRepository
                .findByChanson(chansonId),

            this.saisonChanteurRepository
                .findBySaison(saisonId),

            this.saisonChanteurPupitreRepository
                .findBySaisonAndChanson(
                    saisonId,
                    chansonId
                )
        ]);


        /*
         * Vérification des réponses Repository
         */

        if (chansonPupitresResponse.error) {

            return BaseResponse.error(
                [],
                chansonPupitresResponse.error.message
            );
        }


        if (saisonChanteursResponse.error) {

            return BaseResponse.error(
                [],
                saisonChanteursResponse.error.message
            );
        }


        if (saisonChanteurPupitresResponse.error) {

            return BaseResponse.error(
                [],
                saisonChanteurPupitresResponse.error.message
            );
        }


        /*
         * Tout est OK
         */

        return BaseResponse.success({

            chansonPupitres:
                chansonPupitresResponse.data || [],

            saisonChanteurs:
                saisonChanteursResponse.data || [],

            saisonChanteurPupitres:
                saisonChanteurPupitresResponse.data || []

        });
    }
}