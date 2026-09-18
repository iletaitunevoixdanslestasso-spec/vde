import { BaseController } from "./BaseController";


export class RepetitionController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm() {

        const saisonId = this.context.saisonId;

        const liste = await this.service.findLieux();
        console.log(liste)
        const lieux = liste.map(item => ({
            ...item,
            value: `${item.nom} ${item.description}`
        }));

        const {success, data,error, message} = await this.service.getAvailableType(saisonId);
        console.log(success, data,error, message)
        if (!success) {
            return {};
        }
        const availableType = data
        .map(type => {
                return {
                    id: type.id,
                    value: `${type.libelle}`,
                };
            });
        return { availableType, lieux }


    }


    async getForDashboard(saisonId) {

        try {

            const data =
                await this.service.getForDashboard(saisonId);
            console.log(data)
            return {
                success: true,
                data:data.data
            };

        } catch (error) {

            console.error(
                "repetitionController.getForDashboard",
                error
            );

            return {
                success: false,
                error
            };
        }
    }
    manageSaisonRepetitionChanteur(repetition, load) {

        console.log(
            "repetionCOntroller.manageSaisonRepetitionChanteur",
            repetition
        );
        console.log(this.context)
        return (`/admin/saison/${this.context.saisonNom}/repetition/${repetition.date}/chanteurs`);

    }    
}
