import { BaseController } from "./BaseController";


export class ConcertController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm() {

        const lieux = await this.service.findLieux();

        return {
            lieux
        };
    }

}
