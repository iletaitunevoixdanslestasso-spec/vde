import { BaseResponse } from "../core/framework/BaseResponse";
import { RendezvouRepository } from "../repositories/RendezvouRepository";
import { RepetitionstypeRepository } from "../repositories/RepetitionstypeRepository";
import { BaseService } from "./BaseService";


export class RepetitionService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.repetitionstypeRepository = new RepetitionstypeRepository('repetitions_type');
        this.rendezvousRepository = new RendezvouRepository('rendezvous');
    }
    async getForDashboard(saisonId) {

        const { data, error } =
            await this.repository.findBySaison(saisonId);

        console.log(data)
        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(
            data
        );
    }
    // le system appel le service.getALl de l'entite pour afficher la liste des entites
    // si je veux modifier la reponse il faut surcharger cette methode
    async getAll() {

        const saisonId = this.context.saisonId;
        const { data, error } = await this.repository.findBySaison(saisonId);
        if (error) {
            return {
                success: false,
                errors: error
            };
        }
        // // j'enlève des lignes de la able liaison les lignes dontle referentiel est null
        // const filteredData = data.filter(item => item.chansons !== null);

        data.sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );



        return {
            success: true,
            data
        };

        return {
            success: true,
            data: filteredData
        };
        // return this.repository.findBySaison(saisonId);

    }

    async getAvailableType(saisonId) {

        const { data, error } =
            await this.repetitionstypeRepository.findAll();

        if (error) {
            return BaseResponse.error([], error.message);
        }

        // const disponibles = chansons.filter(chanson =>
        //     chanson.saison_chansons.length === 0 ||
        //     chanson.saison_chansons.every(sc => sc.deleted_at !== null)
        // );
        console.log(data)
        const baserReponse = BaseResponse.success(data);
        console.log(baserReponse)
        return BaseResponse.success(data);
    }

    async save(entity) {
        console.log(entity)
        const { data: rendezvous, error } =
            await this.rendezvousRepository.findTypeRepetition();

        if (error) {
            return BaseResponse.error([], error.message);
        }

        const entityToSave = {
            ...entity,
            rendezvous_id: rendezvous.id,
            saison_id: this.context.saisonId
        };

        return super.save(entityToSave);
    }

    async findDuJourPourChanteur(saisonId, saisonChanteurId) {
        return this.repository.findDuJourPourChanteur(
            saisonId,
            saisonChanteurId
        );
    }
    async saveParticipation(
        token,
        saisonChanteurId,
        repetitionId,
        participe
    ) {

        return this.repository.saveParticipation(
            token,
            saisonChanteurId,
            repetitionId,
            participe
        );
    }

}
