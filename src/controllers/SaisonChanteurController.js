// Responsabilités :

// recevoir les actions de la page React
// appeler le service
// retourner les réponses BaseResponse
import { BaseController } from "./BaseController";


export class SaisonChanteurController extends BaseController {

    constructor(service) {
        super(service);
    }


    /**
     * Liste les chanteurs d'une saison
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

        const res = await this.service.getAvailableChanteurs(saisonId);

        if (!res.success) {
            return {};
        }

        return {
            availableChanteurs: res.data
        };
    }


    /**
     * Liste les chanteurs disponibles à ajouter
     */
    async getAvailableChanteurs(saisonId) {

        console.log(
            "SaisonChanteurController.getAvailableChanteurs",
            saisonId
        );

        return this.service.getAvailableChanteurs(saisonId);
    }



    /**
     * Ajouter un chanteur à une saison
     */
    async addChanteur(saisonId, chanteurId) {

        console.log(
            "SaisonChanteurController.addChanteur",
            {
                saisonId,
                chanteurId
            }
        );

        return this.service.addChanteur(
            saisonId,
            chanteurId
        );
    }



    /**
     * Retirer un chanteur d'une saison
     */
    async removeChanteur(id) {

        console.log(
            "SaisonChanteurController.removeChanteur",
            id
        );

        return this.service.removeChanteur(id);
    }

}