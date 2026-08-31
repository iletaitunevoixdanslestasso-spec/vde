import { BaseResponse } from "../core/framework/BaseResponse";
import { RendezvouRepository } from "../repositories/RendezvouRepository";
import { BaseService } from "./BaseService";


export class ConcertService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.rendezvouRepository = new RendezvouRepository("rendezvous");
    }
    async findLieux() {

        return this.rendezvouRepository.findLieux();

    }

    async getAllBySaison() {
        const saisonId = this.context.saisonId;
        console.log("tconcert service getAllBySaison", saisonId)
        const { data, error } = await this.rendezvouRepository.findBySaisonAndTypeConcert(saisonId);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        console.log(data)

        if (data) {
            data
                .map(e => this.mapper.toUi(e))
                .sort((a, b) =>
                    a.titre.localeCompare(b.titre)
                );
        }
        return BaseResponse.success(data);

    }

    async getAll() {
        console.log("concerceservice getALL")
        const { data, error } = await this.rendezvouRepository.findByTypeConcert();

        if (error) {
            return BaseResponse.error([], error.message);
        }

        console.log(data)

        if (data) {
            data
                .map(e => this.mapper.toUi(e))
                .sort((a, b) =>
                    a.titre.localeCompare(b.titre)
                );
        }
        return BaseResponse.success(data);

    }

    async saveSaisonConcert(form) {
        // enregistrement le lieu sinicessaire, le rendezvous
        console.log("saveSaisonConcert", form);
        const saisonId = this.context.saisonId;
        const { data, success } = await this.save(form);
        console.log("saveSaisonConcert", data);
        console.log("saveSaisonConcert", success);
        let saison_rendezvous_id = null;
        if(form.saison_rendezvous && form.saison_rendezvous.length)
            saison_rendezvous_id = form.saison_rendezvous[0].id;
        if (success) {
            if (!saison_rendezvous_id) {
                //faut créer le lien dans saison_concert
                
                const saison_rendezvous = await this.rendezvouRepository.createSaisonRendezvous({
                    saison_id: saisonId,
                    rendezvous_id: data.id,
                });
                console.log(saison_rendezvous)
                saison_rendezvous_id = saison_rendezvous.id
            }

        }
        let newData={
            ...data,
            saison_rendezvous_id : saison_rendezvous_id
        }
        console.log(newData)
        return BaseResponse.success(newData);

    }
    async findTypeConcert() {
        const res =
            await this.rendezvouRepository.findTypeConcert();
        return res
    }
    async save(form) {
        console.log(form)
        let lieuId = form.lieu_id || null;
        let rendezvousId = form.id || null;

        if (form.lieu_mode === "nouveau") {

            const lieu = await this.rendezvouRepository.createLieu({
                nom: form.lieu_nom,
                rue: form.lieu_rue,
                ville: form.lieu_ville,
                code_postale: form.lieu_code_postale,
                description: form.lieu_description
            });

            lieuId = lieu.id;
        }
        console.log("lieuid", lieuId)
        // const { data: rendezvous_type, error } =
        //     await this.rendezvouRepository.findTypeConcert();
        const concert = {
            id: rendezvousId,
            titre: form.titre,
            heure_rdv: form.heure_rdv,
            heure_debut: form.heure_debut,
            duree_previsionnelle: form.duree_previsionnelle,
            description: form.description,
            date: form.date,
            rendezvous_type_id: form.rendezvous_type_id,
            lieu_id: lieuId
        };

        return super.save(concert);
    }
}
