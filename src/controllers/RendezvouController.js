import { BaseController } from "./BaseController";


export class RendezvouController extends BaseController {

    constructor(service) {
        super(service);
    }
    async getForDashboard(saisonId) {

        try {

            const data =
                await this.service.getForDashboard(saisonId);
            console.log(data)
            const dataAdapte = []
            data.data.map((sr)=>{
                dataAdapte.push({
                    ...sr,
                    ...sr.rendezvous,
                    debut:sr.rendezvous.heure_debut,
                })
            })
            return {
                success: true,
                data:dataAdapte
            };

        } catch (error) {

            console.error(
                "RendezvouController.getForDashboard",
                error
            );

            return {
                success: false,
                error
            };
        }
    }

}
