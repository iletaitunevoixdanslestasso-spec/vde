import { AccesController } from "./AccesController";
import { BaseController } from "./BaseController";

export class ChansonpupitreController extends BaseController {

    constructor(service) {
        super(service);
        this.accesController = new AccesController();
    }



    /**
     * Liste les chansons d'une saison
     */
    async getBySaison(saisonId) {

        console.log(
            "ChansonpupitreController.getBySaison",
            saisonId
        );

        return this.service.getBySaison(saisonId);
    }
    async prepareCreate() {
        console.log(this.context)
        console.log(this.service)
        const chansonId = this.context.chansonId;
        const res = await this.service.getAvailablePupitres(chansonId);

        if (!res.success) {
            return {};
        }
        const availablePupitres = res.data
            .sort((a, b) => {
                const aSaison = a.chanson_pupitres[0];
                const bSaison = b.chanson_pupitres[0];

                const aDesactive = aSaison?.deleted_at != null;
                const bDesactive = bSaison?.deleted_at != null;

                if (aDesactive !== bDesactive) {
                    return aDesactive ? 1 : -1;
                }

                const nom = a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
                if (nom !== 0) return nom;

                
            })
            .map(chanson => {
                const chansonpupitre = chanson.chanson_pupitres[0];

                const desactive = chansonpupitre?.deleted_at != null;

                return {
                    id: chanson.id,
                    value: `${chanson.nom}` +
                        (desactive ? " (désactivé)" : ""),
                    disabled: desactive
                };
            });
        return { availablePupitres }
    }


    /**
     * Liste les chansons disponibles à ajouter
     */
    async getAvailableChansons(saisonId) {

        console.log(
            "ChansonpupitreController.getAvailableChansons",
            saisonId
        );

        return this.service.getAvailableChansons(saisonId);
    }


    /**
     * Liste les chansons disponibles à ajouter
     */
    async getAvailableChansons(saisonId) {

        console.log(
            "ChansonpupitreController.getAvailableChansons",
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
            "ChansonpupitreController.reactivate",
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
            "ChansonpupitreController.removeChanteur",
            id
        );

        return this.service.removeChanteur(id);
    }

    generateAccessLink(saisonchanson) {
        console.log("generateAccessLink", saisonchanson);
        return this.accesController.generateLink(saisonchanson);
    }
    copyAccessLink(saisonChansons) {
        console.log(saisonChansons)
        const token = saisonChansons.acces.length ? saisonChansons.acces[0].token : 'aucun accès généré'
        navigator.clipboard.writeText(token);
    }
    async sendAccessLink(saisonChansons) {
        const result = await this.accesController.generateLink(saisonChansons);

        // pour l'instant console (on fera email étape 9)
        console.log("Lien à envoyer :", result.url);

        return result;
    }

}