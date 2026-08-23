import { ConcertController } from "./ConcertController";


export class SaisonConcertController extends ConcertController {

    constructor(service) {
        super(service);
    }

    async load(onSuccess, onError) {
        console.log("SaisonConcertController")
        return this.handle(
            () => this.service.getAllBySaison(),
            { onSuccess, onError }
        );
    }
    async save(form, onSuccess, onError) {
        console.log("SaisonConcertController save", form);

        return this.handle(
            () => this.service.saveSaisonConcert(form),
            {
                onSuccess,
                onError
            }
        );
    }

}
