import { BaseController } from "./BaseController";


export class RepetitionController extends BaseController {

    constructor(service) {
        super(service);
    }
    prepareEditItem(row) {

        const rendezvous =
            row.rendezvous;


        const isRepetitionDefault =
            rendezvous
                ?.rendezvous_type
                ?.code === "repet";


        return {

            ...row,

            lieu_mode:
                isRepetitionDefault
                    ? "repetition"
                    : "existant",

            lieu_id:
                isRepetitionDefault
                    ? null
                    : rendezvous?.lieu_id ?? null

        };
    }

    async prepareForm() {

        const saisonId = this.context.saisonId;

        const liste = await this.service.findLieux();
        console.error(liste)
        const lieux = liste.map(item => ({
            ...item,
            value: `${item.nom} ${item.description}`
        }));

        const { success, data, error, message } = await this.service.getAvailableType(saisonId);
        console.error(success, data, error, message)
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
            console.error(data)
            return {
                success: true,
                data: data.data
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

        
        return (`/admin/saison/${this.context.saisonNom}/repetition/${repetition.date}/chanteurs`);

    }

    getMesRepetitions(
        saisonId,
        saisonChanteurId,
        onSuccess,
        onError
    ) {

        return this.handle(
            () => this.service.getMesRepetitions(
                saisonId,
                saisonChanteurId
            ),
            {
                onSuccess,
                onError
            }
        );
    }
}
