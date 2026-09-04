import { BaseResponse } from "../core/framework/BaseResponse";
import { BaseService } from "./BaseService";


export class SaisonrepetitionchanteurService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
    }

    async findBySaisonAndRepetition() {
        console.log(this.context);



        const { data, error } = await this.repository.findBySaisonAndRepetition(this.context.saisonId, this.context.repetitionId);
        if (error) {
            return BaseResponse.error([], error.message);
        }
        return BaseResponse.success(data);

        // // Supprime les lignes dont le pupitre a été supprimé
        // const filteredData = data.filter(item => item.pupitres !== null);

        // filteredData.sort((a, b) =>
        //     a.chansons.titre.localeCompare(b.chansons.titre)
        // );

        console.log("service data", data)
        console.log("service success", success)
        return {
            success: true,
            data
        };
    }
    async saveParticipation(
        repetitionId,
        saisonChanteurId,
        participe
    ) {
        return this.repository.saveParticipation(
            repetitionId,
            saisonChanteurId,
            participe
        );
    }
}
