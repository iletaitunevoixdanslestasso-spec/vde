import { AccesController } from "./AccesController";
import { BaseController } from "./BaseController";

export class GroupesController extends BaseController {

    constructor(service) {
        super(service);
        this.accesController = new AccesController();
    }



    /**
     * Liste les chansons d'une saison
     */
    async getBySaison(saisonId) {

        console.log(
            "groupe.getBySaison",
            saisonId
        );

        return this.service.getBySaison(saisonId);
    }
    async prepareCreate_NOP() {

        const saisonId = this.context.saisonId;
        const res = await this.service.getAvailableGroupe(saisonId);

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
     * Liste les chansons disponibles à ajouter
     */
    async getAvailableChansons(saisonId) {

        console.log(
            "SaisonChanteurController.getAvailableChansons",
            saisonId
        );

        return this.service.getAvailableChansons(saisonId);
    }




}