import { ConcertController } from "./ConcertController";


export class SaisonInvitationController extends ConcertController {

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

    async prepareForm() {

        const lieuxConcert = await super.prepareForm();
        console.log(lieuxConcert)
        const lieux =  lieuxConcert.lieux
        const listeType = await this.service.findType();
        console.log(listeType)
        const rendezvous_type = listeType.map(item => ({
            ...item,
            value: `${item.libelle} ${item.description}`
        }));
        console.log(lieux)
        console.log(rendezvous_type)
        const res = {
            lieux,
            rendezvous_type
        }
        console.log(res)
        return res;
    }

    async save(form, onSuccess, onError) {
        console.log("SaisonINVITATIONController save", form);

        return this.handle(
            () => this.service.saveSaisonConcert(form),
            {
                onSuccess,
                onError
            }
        );
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
    async saveParticipation(token, chanteur, concertId, saison_rendezvous, participe, cbSuccess, cbError) {
        let result = await this.service.saveParticipation(token, chanteur, concertId, saison_rendezvous, participe)
        if (result.success)
            return cbSuccess(result)
        return cbError(result)
    }


}
