import { ConcertController } from "./ConcertController";


export class SaisonConcertController extends ConcertController {

    constructor(service) {
        super(service);
    }
    manageSaisonConcertChanson(concert, load) {

        // window.location.href =
        //     `/admin/saisons/${saison.nom}/chanteurs`;
        console.log(
            "SaisonConcertController.manageChanson",
            concert
        );
        console.log(this.context)
        return (`/admin/saison/concert/${concert.titre}/chansons`);

        return (`/admin/chanson/${saison.nom}/chanteurs`);

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
