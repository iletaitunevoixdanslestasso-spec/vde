import { BaseService } from "./BaseService";
import { BaseResponse } from "../core/framework/BaseResponse";




export class SaisonService extends BaseService {


    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
    }

    async getAll(orderBy = "date_debut") {

        const saisons = await this.repository.findAllActives(orderBy);

        return {
            success: true,
            data: saisons
        };
    }
    async getActive() {

        const { data, error } = await this.repository.findOneBy({
            active: true
        });
        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(this.mapper.toUi(data));
    }

    // ⭐ spécifique métier
    async setActive(id) {

        const result =
            await this.repository.setActive(id);

        if (result.error)
            return BaseResponse.error([], result.error.message);

        return BaseResponse.success(
            null,
            "Saison activée"
        );
    }

}