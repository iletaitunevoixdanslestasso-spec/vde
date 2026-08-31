import { BaseResponse } from "../core/framework/BaseResponse";
import { RendezvouRepository } from "../repositories/RendezvouRepository";
import { BaseService } from "./BaseService";
import { ConcertService } from "./ConcertService";


export class InvitationService extends ConcertService {

    

    async getAllBySaison() {
        const saisonId = this.context.saisonId;
        console.log("INVITATION getAllBySaison", saisonId)
        const { data, error } = await this.rendezvouRepository.findBySaisonAndTypeAutres(saisonId);

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

    async findType() {

        return this.rendezvouRepository.findType();

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

}
