import { BaseController } from "./BaseController";


export class RepetitionController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm() {

        const saisonId = this.context.saisonId;
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
        return { availableType }


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

}
