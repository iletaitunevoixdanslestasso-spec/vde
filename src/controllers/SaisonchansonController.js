import { AccesController } from "./AccesController";
import { BaseController } from "./BaseController";

export class SaisonchansonController extends BaseController {

    constructor(service) {
        super(service);
        this.accesController = new AccesController();
    }

    managePupitres(saisonchanson, load) {
        const chanson=saisonchanson.chansons

        console.log(
            "SaisonchansonController.managePupitres",
            chanson
        );

        return (`/admin//chanson/${chanson.titre}/pupitres`);

        return (`/admin/chanson/${saison.nom}/chanteurs`);

    }

    /**
     * Liste les chansons d'une saison
     */
    async getBySaison(saisonId) {

        console.log(
            "SaisonChanteurController.getBySaison",
            saisonId
        );

        return this.service.getBySaison(saisonId);
    }
    async prepareForm() {

        const saisonId = this.context.saisonId;
        const res = await this.service.getAvailableChansons(saisonId);

        if (!res.success) {
            return {};
        }
        const availableChansons = res.data
            .sort((a, b) => {
                const aSaison = a.saison_chansons[0];
                const bSaison = b.saison_chansons[0];

                const aDesactive = aSaison?.deleted_at != null;
                const bDesactive = bSaison?.deleted_at != null;

                if (aDesactive !== bDesactive) {
                    return aDesactive ? 1 : -1;
                }

                const titre = a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" });
                if (titre !== 0) return titre;

                
            })
            .map(chanson => {
                const saisonChanteur = chanson.saison_chansons[0];

                const desactive = saisonChanteur?.deleted_at != null;

                return {
                    id: chanson.id,
                    value: `${chanson.titre}` +
                        (desactive ? " (désactivé)" : ""),
                    disabled: desactive
                };
            });
        return { availableChansons }
    }


    /**
     * Liste les chansons disponibles à ajouter
     */
    async getAvailableChansons(saisonId) {

        console.log(
            "SaisonChanteurController.getAvailableChansons",
            saisonId
        );

        return this.service.getAvailableChansons(saisonId);
    }



    /**
     * reactivate un chanson à une saison
     */
    async reactivate(chansonId, saisonId) {
        // const saisonId = this.context.saisonId;
        console.log(
            "SaisonChanteurController.reactivate",
            saisonId,
            chansonId


        );

        return this.service.reactivate(
            chansonId,
            saisonId
        );
    }



    /**
     * Retirer un chanson d'une saison
     */
    async removeChanteur(id) {

        console.log(
            "SaisonChanteurController.removeChanteur",
            id
        );

        return this.service.removeChanteur(id);
    }


}