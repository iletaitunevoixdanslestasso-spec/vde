import { ConcertController } from "./ConcertController";


export class SaisonInvitationController extends ConcertController {

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

    async prepareForm() {

        const lieuxConcert = await super.prepareForm();
        console.error(lieuxConcert)
        const lieux =  lieuxConcert.lieux
        const listeType = await this.service.findType();
        console.error(listeType)
        const rendezvous_type = listeType.map(item => ({
            ...item,
            value: `${item.libelle} ${item.description}`
        }));
        console.error(lieux)
        console.error(rendezvous_type)
        const res = {
            lieux,
            rendezvous_type
        }
        console.error(res)
        return res;
    }

    async save(form, onSuccess, onError) {
        console.error("SaisonINVITATIONController save", form);

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


}
