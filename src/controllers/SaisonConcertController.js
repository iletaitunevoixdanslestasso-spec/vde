import { ConcertController } from "./ConcertController";


export class SaisonConcertController extends ConcertController {

    constructor(service) {
        super(service);
    }
    manageSaisonConcertChanson(concert, load) {

        console.error(
            "SaisonConcertController.manageChanson",
            concert
        );
        console.error(this.context)
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
        console.error("SaisonConcertController")
        return this.handle(
            () => this.service.getAllBySaison(),
            { onSuccess, onError }
        );
    }
    async saveParticipation(token, chanteur, concertId, saison_rendezvous, participe, cbSuccess, cbError) {
        let result = await this.service.saveParticipation(token, chanteur, concertId, saison_rendezvous, participe)
        if (result.success)
            return cbSuccess(result)
        return cbError(result)
    }
    async save(form, onSuccess, onError) {
        console.error("SaisonConcertController save", form);
        const { data, error } = await this.service.findTypeConcert()
        if (error) { }

        console.error(data)
        const newForm = {
            ...form,
            rendezvous_type_id: data.id
        }
        console.error(newForm)

        return this.handle(
            () => this.service.saveSaisonConcert(newForm),
            {
                onSuccess,
                onError
            }
        );
    }

    getChansonsConcert(
        token,
        saisonRendezvousId,
        onSuccess,
        onError
    ) {

        return this.handle(
            () => this.service.getChansonsByConcert(
                saisonRendezvousId
            ),
            {
                onSuccess,
                onError
            }
        );
    }

}
