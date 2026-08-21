import { BaseResponse } from "../core/framework/BaseResponse";
import { BaseService } from "./BaseService";


export class RendezvouService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
    }
    /**
     * Liste les chanteurs d'une saison
     */
    async getForDashboard(saisonId) {

        const { data, error } =
            await this.repository.findForDashboard(saisonId);

        console.log(data)
        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(
            data
        );
    }
}
