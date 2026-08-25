import { ConcertController } from "./ConcertController";


export class SaisonConcertController extends ConcertController {

    constructor(service) {
        super(service);
    }
    manageSaisonConcertChanson(concert, load) {

        console.log(
            "SaisonConcertController.manageChanson",
            concert
        );
        console.log(this.context)
        return (`/admin/saison/${this.context.saisonNom}/concert/${concert.titre}/chansons`);

        return (`/admin/chanson/${saison.nom}/chanteurs`);

    }    
    getMesConcerts(token, saisonId, chanteurId, onSuccess, onError) {

        return this.handle(
            () => this.service.getMesConcerts(
                token,
                saisonId,
                chanteurId
            ),
            {
                onSuccess,
                onError
            }
        );
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
