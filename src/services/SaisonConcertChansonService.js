import { BaseResponse } from "../core/framework/BaseResponse";
import { ChansonRepository } from "../repositories/ChansonRepository";
import { BaseService } from "./BaseService";


export class SaisonConcertChansonService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.chansonRepository = new ChansonRepository('chansons');
    }
    async findAllNotDelete(orderBy) {

        const { data, error } = await this.repository.findAllNotDelete(this.context.saisonConcertId, orderBy);

        if (error) {
            return BaseResponse.error([], error.message);
        }
        console.log('findAllNotDelete', data)
        const dataAjuste = []
        data.map((scc) => {
            dataAjuste.push(
                {
                    ...scc,
                    chansons: scc.saison_chansons?.chansons,
                    saison_id: this.context.saisonId,
                }
            )
        })
        return BaseResponse.success(dataAjuste);
        return BaseResponse.success(data.map(e => this.mapper.toUi(e)));

    }
    /**
     * Liste des chansons pouvant être ajoutés
     */
    async getAvailableChansons(saisonId, saisonConcertId) {

        const { data: chansons, error } =
            await this.repository.findAllInSaisonConcert(saisonId, saisonConcertId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        // const disponibles = chansons.filter(chanson =>
        //     chanson.saison_chansons.length === 0 ||
        //     chanson.saison_chansons.every(sc => sc.deleted_at !== null)
        // );

        console.log(chansons)
        return BaseResponse.success(chansons);
    }

    async insert(entity) {
        return this.addSaisonChanson(entity);
    }
    /**
     * Ajout d'un addSaisonChanson dans une saison_concert
     */
    async addSaisonChanson(entity) {
        const saisonConcertId = this.context.saisonConcertId
        const saisonChansonId = entity.saison_chanson_id
        console.log("saisonConcertId", saisonConcertId)
        console.log("entity", entity)
        console.log("saisonChansonId", saisonChansonId)

        const { data: exists, error: existsError } =
            await this.repository.exists(
                saisonChansonId,
                saisonConcertId
            );


        if (exists) {
            return BaseResponse.error(
                [],
                "Ce pupitre est déjà associé à cette chanson",
                {
                    action: "reactivateChansonSaison",
                    pupitreId,
                    chansonId
                }
            );
        }


        const { data, error } =
            await this.repository.insert({
                saison_rendezvous_id: saisonConcertId,
                saison_chanson_id: saisonChansonId,
            });


        if (error) {
            return BaseResponse.error([], error.message);
        }


        return BaseResponse.success(data);
    }

}
