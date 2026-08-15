import { BaseResponse } from "../core/framework/BaseResponse";
import { ChansonRepository } from "../repositories/ChansonRepository";
import { BaseService } from "./BaseService";


export class SaisonchansonService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.chansonRepository = new ChansonRepository('chansons');
    }
    async getAll() {

        const saisonId = this.context.saisonId;
        const { data, error } = await this.repository.findBySaison(saisonId);
        if (error) {
            return {
                success: false,
                errors: error
            };
        }
        // j'enlève des lignes de la able liaison les lignes dontle referentiel est null
        const filteredData = data.filter(item => item.chansons !== null);
        filteredData.sort((a, b) =>
            a.chansons.titre.localeCompare(b.chansons.titre)
        );

        return {
            success: true,
            data:filteredData
        };
        // return this.repository.findBySaison(saisonId);

    }

    /**
     * Liste des chansons pouvant être ajoutés
     */
    async getAvailableChansons(saisonId) {

        const { data: chansons, error } =
            await this.chansonRepository.findAllAndSaison(saisonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        const disponibles = chansons.filter(chanson =>
            chanson.saison_chansons.length === 0 ||
            chanson.saison_chansons.every(sc => sc.deleted_at !== null)
        );

        return BaseResponse.success(disponibles);
    }

    async save(data) {

        if (this.validator) {
            const validation = this.validator.validate(data);

            if (!validation.valid) {
                return BaseResponse.error(validation.errors);
            }
        } else {
            alert("pas de validateuir")
            return
        }


        return this.addChanson(
            data.chanson_id
        );
    }
    /**
     * Ajout d'un chanson dans une saison
     */
    async addChanson(chansonId) {
        const saisonId = this.context.saisonId;

        console.log("chansonId", chansonId)
        console.log("saisonId", saisonId)
        const { data: exists, error: existsError } =
            await this.repository.exists(
                saisonId,
                chansonId
            );
        console.log(exists)
        console.log(existsError)

        if (exists) {
            return BaseResponse.error(
                [],
                "Ce chanson est déjà associé à cette saison",
                {
                    action: "reactivateChansonSaison",
                    chansonId,
                    saisonId
                }
            );
        }


        const { data, error } =
            await this.repository.insert({
                saison_id: saisonId,
                chanson_id: chansonId
            });


        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(data);
    }


}
