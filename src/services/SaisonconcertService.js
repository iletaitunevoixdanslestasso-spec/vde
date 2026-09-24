import { BaseResponse } from "../core/framework/BaseResponse";
import { supabase } from "../core/supabase/client";
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


        const { data: { session }, error: sessionError } =
    await supabase.auth.getSession();

// console.error("SUPABASE SESSION :", session);
// console.error("SUPABASE SESSION ERROR :", sessionError);
// console.error("TOKEN LOCALSTORAGE :", localStorage.getItem("token"));
//   console.error("SAISON CONCERTS", saisonConcerts);
//     console.error("SAISON CONCERTS DATA", saisonConcerts.data);
//     console.error("SAISON CONCERTS ERROR", saisonConcerts.error);

//         console.error("participations", participations)
//         console.error("TOKEN LOCALSTORAGE :", localStorage.getItem("token"));
// console.error("TOKEN COMPLET :", token);
        const data = saisonConcerts.data.map(concert => {
            const participation = participations.data.find(
                participation =>
                    participation.saison_rendezvous.rendezvous_id === concert.id
            );
            return {
                ...concert,
                participation: participation
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
        console.error(token, chanteur,concertId,saison_rendezvous_id,participe)
        const {data,error} =  await this.saisonConcertChanteurRepository.saveParticipation(token,saison_rendezvous_id, chanteur.saisonChanteur.id, participe )
        if(!data)
            return BaseResponse.error([], "erreur dans la requête")
        return BaseResponse.success(data)
        // let result = this.service.saveParticipation(token, saisonId, chanteurId, concertId, saison_rendezvous, participe)
    }

async getChansonsByConcert(saisonRendezvousId) {

    const { data, error } =
        await this.repository.findChansonsByConcert(
            saisonRendezvousId
        );

    if (error) {
        return BaseResponse.error([], error.message);
    }

    return BaseResponse.success(data);
}    
}
