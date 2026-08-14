import { BaseService } from "./BaseService";
import { BaseResponse } from "../core/framework/BaseResponse";

export class GroupeService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
    }

    async getAll() {

        const saisonId = this.context.saisonId;

        const { data, error } =
            await this.repository.findBySaison(saisonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(
            data.map(e => this.mapper.toUi(e))
        );
    }

    async save(entity) {

        if (!this.context.saisonId) {
            return BaseResponse.error(
                [],
                "Aucune saison sélectionnée"
            );
        }

        // Validation des données du formulaire
        if (this.validator) {
            const validation = this.validator.validate(entity);

            if (!validation.valid) {
                return BaseResponse.error(validation.errors);
            }
        }

        // Mapping formulaire → DB
        const dbEntity = this.mapper
            ? this.mapper.toDb(entity)
            : entity;

        // La saison vient du contexte, pas du formulaire
        dbEntity.saison_id = this.context.saisonId;

        let result;

        if (entity.id) {
            result = await this.repository.update(
                entity.id,
                dbEntity
            );
        } else {
            result = await this.repository.insert(dbEntity);
        }

        if (result.error) {
            return BaseResponse.error(
                [],
                result.error.message
            );
        }

        return BaseResponse.success(
            this.mapper.toUi(result.data)
        );
    }
}