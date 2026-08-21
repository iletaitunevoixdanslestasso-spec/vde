import { BaseController } from "./BaseController";


export class RendezvouController extends BaseController {

    constructor(service) {
        super(service);
    }
    async getForDashboard() {

        try {

            const data =
                await this.service.getForDashboard();
            console.log(data)
            return {
                success: true,
                data:data.data
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
