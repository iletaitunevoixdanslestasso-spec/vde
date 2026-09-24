import { BaseController } from "./BaseController";


export class ConcertController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm() {

        const liste = await this.service.findLieux();
        console.error(liste)
        const lieux = liste.map(item => ({
            ...item,
            value: `${item.nom} ${item.description}`
        }));
        return {
            lieux
        };
    }

}
