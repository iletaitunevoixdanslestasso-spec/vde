import { BaseResponse } from "../core/framework/BaseResponse";
import { RendezvouRepository } from "../repositories/RendezvouRepository";
import { SaisonConcertChanteurRepository } from "../repositories/SaisonConcertChanteurRepository";
import { BaseService } from "./BaseService";


export class SaisonconcertService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.rendezvouRepository = new RendezvouRepository("rendezvous");
        this.saisonConcertChanteurRepository = new SaisonConcertChanteurRepository("saison_concert_chanteurs");
    }


    /**
     * Récupère les chansons de la saison.
     *
     * Pour chaque chanson :
     *
     * 1. choix spécifique du chanteur s'il existe
     * 2. sinon pupitre principal de la saison
     */
    async getMesConcerts(token, saisonId, chanteurId) {

        const [
            saisonConcerts,
            participations
        ] = await Promise.all([

            this.rendezvouRepository.findBySaisonAndTypeConcert(
                saisonId
            ),

            this.saisonConcertChanteurRepository.findBySaisonAndChanteur(
                token,
                saisonId,
                chanteurId
            )
        ]);

        console.log("participations", participations)
        const data = saisonConcerts.data.map(concert => {
            const participation = participations.data.find(
                participation =>
                    participation.saison_rendezvous.rendezvous_id === concert.id
            );
            return {
                ...concert,
                participe: participation
                    ? participation.participe
                    : null
            };
        });

        return {
            success: true,
            data
        };
    }
    async saveParticipation(token, chanteur,concertId,saison_rendezvous_id,participe) {
        const {data,error} =  await this.saisonConcertChanteurRepository.saveParticipation(token,saison_rendezvous_id, chanteur.saisonChanteur.id, participe )
        if(!data)
            return BaseResponse.error([], "erreur dans la requête")
        return BaseResponse.success(data)
        // let result = this.service.saveParticipation(token, saisonId, chanteurId, concertId, saison_rendezvous, participe)
    }
}
