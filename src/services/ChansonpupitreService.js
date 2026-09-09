import { BaseResponse } from "../core/framework/BaseResponse";
import { PupitreRepository } from "../repositories/PupitreRepository";
import { BaseService } from "./BaseService";


export class ChansonpupitreService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.pupitreRepository = new PupitreRepository('pupitres');
    }
    async getAll() {
        console.log(this.context);

        const chansonId = this.context.chansonId;
        console.log("chansonId", chansonId);

        const { data, error } = await this.repository.findBySaison(chansonId);

        if (error) {
            return {
                success: false,
                errors: error
            };
        }

        // Supprime les lignes dont le pupitre a été supprimé
        const filteredData = data.filter(item => item.pupitres !== null);

        filteredData.sort((a, b) =>
            a.chansons.titre.localeCompare(b.chansons.titre)
        );

        return {
            success: true,
            data: filteredData
        };
    }
    /**
     * Liste des chansons pouvant être ajoutés
     */
    async getAvailablePupitres(chansonId) {
        console.log(this.pupitreRepository)
        const { data: chansons, error } =
            await this.pupitreRepository.findAllAndChanson(chansonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        const disponibles = chansons.filter(chanson =>
            chanson.chanson_pupitres.length === 0 ||
            chanson.chanson_pupitres.every(sc => sc.deleted_at !== null)
        );

        return BaseResponse.success(disponibles);
    }

    async save_old(data) {

        if (this.validator) {
            const validation = this.validator.validate(data);

            if (!validation.valid) {
                return BaseResponse.error(validation.errors);
            }
        } else {
            alert("pas de validateuir")
            return
        }


        return this.addPupitre(
            data.pupitre_id
        );
    }
    async insert(entity) {
        return this.addPupitre(entity);
    }
    /**
     * Ajout d'un chanson dans une saison
     */
    async addPupitre(chansonPupitre) {

        const chansonId = this.context.chansonId;
        const pupitreId = chansonPupitre.pupitre_id;

        const ordre =
            chansonPupitre.ordre === "" ||
                chansonPupitre.ordre === null ||
                chansonPupitre.ordre === undefined
                ? null
                : Number(chansonPupitre.ordre);

        console.log("pupitreId", pupitreId);
        console.log("chansonId", chansonId);

        const { data: existing, error: existingError } =
            await this.repository.findByPupitreAndChanson(
                pupitreId,
                chansonId
            );

        if (existingError) {
            return BaseResponse.error([], existingError.message);
        }

        // Ligne existante
        if (existing) {

            // Déjà active
            if (existing.deleted_at === null) {
                return BaseResponse.error(
                    [],
                    "Ce pupitre est déjà associé à cette chanson"
                );
            }

            // Ligne supprimée → réactivation
            const { data, error } =
                await this.repository.reactivate(
                    existing.id,
                    {
                        ordre,
                        audio_url: chansonPupitre.audio_url || null
                    }
                );

            if (error) {
                return BaseResponse.error([], error.message);
            }

            return BaseResponse.success(data);
        }

        // Aucune ligne existante → création
        const { data, error } =
            await this.repository.insert({
                pupitre_id: pupitreId,
                chanson_id: chansonId,
                ordre,
                audio_url: chansonPupitre.audio_url || null
            });

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(data);
    }
    async updateOrdres(rows) {
        return this.repository.updateOrdres(rows);
    }
}
