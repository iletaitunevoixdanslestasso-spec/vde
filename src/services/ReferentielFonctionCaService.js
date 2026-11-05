import { BaseService } from "./BaseService";
import { BaseResponse } from "../core/framework/BaseResponse";

export class ReferentielFonctionCaService extends BaseService {
    async save(entity) {
        const conserverOrdre = Boolean(entity.id) && entity.ordre === undefined;
        const ordreVide = typeof entity.ordre === "string" && entity.ordre.trim() === "";
        const normalizedEntity = {
            ...entity,
            libelle: typeof entity.libelle === "string"
                ? entity.libelle.trim()
                : "",
            // Un champ explicitement vidé reprend la valeur par défaut, même en édition.
            ordre: ordreVide || (!entity.id && entity.ordre === undefined)
                ? 1000
                : entity.ordre
        };
        const validation = this.validator.validate(normalizedEntity);

        if (!validation.valid) {
            return BaseResponse.error(validation.errors, validation.errors[0]?.message);
        }

        const dbEntity = this.mapper.toDb(normalizedEntity);
        if (conserverOrdre) delete dbEntity.ordre;
        const { data, error } = entity.id
            ? await this.repository.update(entity.id, dbEntity)
            : await this.repository.insert(dbEntity);

        if (error?.code === "23505") {
            const message = "Une fonction du CA porte déjà ce libellé.";
            return BaseResponse.error([{ field: "libelle", message }], message);
        }

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(this.mapper.toUi(data));
    }

    async delete(id) {
        const { error } = await this.repository.delete(id);

        if (error?.code === "23001" || error?.code === "23503") {
            return BaseResponse.error(
                [],
                "Cette fonction possède des affectations à des choristes, y compris éventuellement pour des saisons passées ou des inscriptions supprimées. Retirez ces affectations avant de la supprimer."
            );
        }

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(null, "Fonction supprimée.");
    }
}
