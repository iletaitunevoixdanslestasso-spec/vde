import { BaseResponse } from "../core/framework/BaseResponse";
// import { ChansonpupitreRepository } from "../repositories/ChansonpupitreRepository";
// import { SaisonChanteurPupitreRepository } from "../repositories/SaisonChanteurPupitreRepository";
// import { SaisonChanteurRepository } from "../repositories/SaisonChanteurRepository";
import { SaisonConcertChanteurRepository } from "../repositories/SaisonConcertChanteurRepository";

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

        this.saisonConcertChanteurRepository =
            new SaisonConcertChanteurRepository("saison_concert_chanteurs");
    }


    async getRepartition(chansonId, saisonId, saisonConcertId) {

        const requests = [
            // 1. Pupitres autorisés pour la chanson
            this.chansonPupitreRepository
                .findByChanson(chansonId),

            // 2. Pupitres des chanteurs de la saison
            this.saisonChanteurPupitreRepository
                .findBySaison(saisonId),

            // 3. Tous les chanteurs de la saison
            this.saisonChanteurRepository
                .findBySaison(saisonId)
        ];

        // 4. Si concert : récupérer les participations
        if (saisonConcertId) {
            requests.push(
                this.saisonConcertChanteurRepository
                    .findByConcert(saisonConcertId)
            );
        }

        const [
            chansonPupitresResponse,
            saisonChanteurPupitresResponse,
            saisonChanteursResponse,
            saisonConcertChanteursResponse
        ] = await Promise.all(requests);


        /*
         * Vérification des réponses Repository
         */

        if (chansonPupitresResponse.error) {
            return BaseResponse.error(
                [],
                chansonPupitresResponse.error.message
            );
        }

        if (saisonChanteurPupitresResponse.error) {
            return BaseResponse.error(
                [],
                saisonChanteurPupitresResponse.error.message
            );
        }

        if (saisonChanteursResponse.error) {
            return BaseResponse.error(
                [],
                saisonChanteursResponse.error.message
            );
        }

        if (
            saisonConcertId &&
            saisonConcertChanteursResponse?.error
        ) {
            return BaseResponse.error(
                [],
                saisonConcertChanteursResponse.error.message
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
                saisonChanteurPupitresResponse.data || [],

            saisonConcertChanteurs:
                saisonConcertChanteursResponse?.data || []

        });
    }
}