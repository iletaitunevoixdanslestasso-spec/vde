import { BaseService } from "./BaseService";
import { supabase } from "../core/supabase/client";
import { BaseResponse } from "../core/framework/BaseResponse";
import { GroupeRepository } from "../repositories/GroupeRepository";

export class ChanteurService extends BaseService {

    constructor(
        repository,
        validator = null,
        mapper = null
    ) {
        super(repository, validator, mapper);
        this.groupeRepository = new GroupeRepository("groupes");
    }


    async getAll(orderBy = "nom") {
        return super.getAll(orderBy);
    }


    async getByToken(token) {

        const {
            data,
            error
        } = await this.repository.findByToken(token);

        if (error) {

            return BaseResponse.error(
                [],
                error.message
            );

        }

        return BaseResponse.success(
            data,
            null
        );
    }


    async updateByToken(token, data) {

        const {
            data: result,
            error
        } = await this.repository.updateByToken(
            token,
            data
        );

        if (error) {

            return BaseResponse.error(
                [],
                error.message
            );

        }

        return BaseResponse.success(
            result,
            "Profil modifié"
        );
    }


    async setActive(id) {

        const { error } =
            await supabase.rpc(
                "set_active_saison",
                { p_id: id }
            );

        if (error) {

            return BaseResponse.error(
                [],
                error.message
            );

        }

        return BaseResponse.success(
            null,
            "Saison activée"
        );
    }
    async updateByToken(token, data) {

        const {
            data: result,
            error
        } = await this.repository.updateByToken(
            token,
            data
        );

        if (error) {

            return BaseResponse.error(
                [],
                error.message
            );

        }

        return BaseResponse.success(
            result,
            "Profil modifié"
        );
    }

    async getAvailableGroupes(saisonId) {
        const { data, error } =
            await this.groupeRepository.findBySaison(saisonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(data);
    }

}