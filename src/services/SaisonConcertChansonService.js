import { BaseResponse } from "../core/framework/BaseResponse";
import { ChansonRepository } from "../repositories/ChansonRepository";
import { BaseService } from "./BaseService";


export class SaisonConcertChansonService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.chansonRepository = new ChansonRepository('chansons');
    }

    async findAllNotDelete(orderBy) {

        const { data, error } = await this.repository.findAllNotDelete(this.context.saisonConcertId, "ordre");

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
    async getAvailableChansons_old(saisonId, saisonConcertId) {

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

    async getAvailableChansons(saisonId, saisonConcertId) {

        const { data: chansons, error } =
            await this.repository.findAllInSaisonConcert(
                saisonId,
                saisonConcertId
            );

        if (error) {
            return BaseResponse.error([], error.message);
        }

        const disponibles = [];
        const desactivees = [];

        for (const chanson of chansons) {

            const relations = chanson.saison_concert_chansons || [];

            // Association active avec ce concert
            const relationActive = relations.find(
                relation => relation.deleted_at === null
            );

            // Association supprimée avec ce concert
            const relationSupprimee = relations.find(
                relation => relation.deleted_at !== null
            );

            // Déjà prévue actuellement → on ne l'affiche pas
            if (relationActive) {
                continue;
            }

            // Ancienne association supprimée → on l'affiche en bas
            if (relationSupprimee) {
                desactivees.push({
                    ...chanson,
                    desactivee: true
                });
                continue;
            }

            // Jamais prévue → disponible normalement
            disponibles.push({
                ...chanson,
                desactivee: false
            });
        }

        return BaseResponse.success([
            ...disponibles,
            ...desactivees
        ]);
    }

    async insert(entity) {
        return this.addToConcert(entity);
        return this.addSaisonChanson(entity);
    }
    // async addToConcert(saisonRendezvousId, saisonChansonId) {
    async addToConcert(entity) {

        const saisonRendezvousId = this.context.saisonConcertId;
        const saisonChansonId = entity.saison_chanson_id;
        const values = {
            ...entity,
            saison_rendezvous_id: saisonRendezvousId
        }

        const { data: existing, error: findError } =
            await this.repository.findBySaisonRendezvousAndSaisonChanson(
                saisonRendezvousId,
                saisonChansonId
            );

        if (findError) {
            return BaseResponse.error([], findError.message);
        }

        // Une ligne existe déjà
        if (existing) {

            // Déjà active → on met simplement à jour les valeurs de l'entité
            // (par exemple l'ordre)
            if (existing.deleted_at === null) {

                const { data, error } =
                    await this.repository.update(
                        existing.id,
                        entity
                    );

                if (error) {
                    return BaseResponse.error([], error.message);
                }

                return BaseResponse.success(data);
            }

            // Ligne supprimée → réactivation + mise à jour des valeurs
            const { data, error } =
                await this.repository.update(
                    existing.id,
                    {
                        ...values,
                        deleted_at: null
                    }
                );

            if (error) {
                return BaseResponse.error([], error.message);
            }

            return BaseResponse.success(data);
        }

        // Aucune ligne → création avec l'entité
        const { data, error } =
            await this.repository.insert(values);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(data);
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
    async updateOrdres(rows) {
        return this.repository.updateOrdres(rows);
    }
}
