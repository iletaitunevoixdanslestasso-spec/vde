import { BaseController } from "./BaseController";


export class LieuxController extends BaseController {

    constructor(service) {
        super(service);
    }


    async pourRepetition(row, load) {

        const result =
            await this.service.setPourRepetition(
                row.id
            );


        if (!result.success) {

            console.error(
                "Erreur setPourRepetition",
                result.message
            );

            return result;
        }


        await load();

        return result;
    }

}