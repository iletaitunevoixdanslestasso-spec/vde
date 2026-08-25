import { BaseController } from "./BaseController";


export class SaisonConcertChansonController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm() {

        const saisonId = this.context.saisonId;
        const saisonConcertId = this.context.saisonConcertId;
        const res = await this.service.getAvailableChansons(saisonId, saisonConcertId);

        if (!res.success) {
            return {};
        }
        console.log(res)
        const availableChansons = res.data
            .sort((a, b) => {
                const aSaison = a.chansons.titre;
                const bSaison = b.chansons.titre;
            })
            .map(chanson => {
                return {
                    id: chanson.id,
                    value: `${chanson.chansons.titre}`,
                };
            });
        return { availableChansons }
    }
    
}
