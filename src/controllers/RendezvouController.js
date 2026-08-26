import { BaseController } from "./BaseController";


export class RendezvouController extends BaseController {

    constructor(service) {
        super(service);
    }
    async getForDashboard(chanteur) {

        try {

            const data =
                await this.service.getForDashboard(chanteur);
            console.log(data)
            const dataAdapte = []
            data.data.map((sr) => {
                const participe = sr.saison_concert_chanteurs.length
                    ? sr.saison_concert_chanteurs?.[0]?.participe
                    : null
                dataAdapte.push({
                    ...sr,
                    ...sr.rendezvous,
                    debut: sr.rendezvous.heure_debut,
                    participation:
                        sr.rendezvous.rendezvous_type.code === "concert"
                            ? participe
                            : null
                })
            })
            return {
                success: true,
                data: dataAdapte
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
