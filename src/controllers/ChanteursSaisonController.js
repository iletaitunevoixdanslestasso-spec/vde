import { ChanteurSaisonService } from "../services/ChanteurSaisonService";
import { ChanteurService } from "../services/ChanteurService";

import { AccesController } from "./AccesController";
import { BaseController } from "./BaseController";

export class ChanteursSaisonController extends BaseController {

    constructor(service) {
        super(service);
        this.accesController = new AccesController();
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
    async prepareCreate() {

        const saisonId = this.context.saisonId;

        const res = await this.service.getAvailableChanteurs(saisonId);

        if (!res.success) {
            return {};
        }
        const availableChanteurs = res.data
            .sort((a, b) => {
                const aSaison = a.saison_chanteurs[0];
                const bSaison = b.saison_chanteurs[0];

                const aDesactive = aSaison?.deleted_at != null;
                const bDesactive = bSaison?.deleted_at != null;

                if (aDesactive !== bDesactive) {
                    return aDesactive ? 1 : -1;
                }

                const nom = a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
                if (nom !== 0) return nom;

                return a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" });
            })
            .map(chanteur => {
                const saisonChanteur = chanteur.saison_chanteurs[0];

                const desactive = saisonChanteur?.deleted_at != null;

                return {
                    id: chanteur.id,
                    value: `${chanteur.nom} ${chanteur.prenom}` +
                        (desactive ? " (désactivé)" : ""),
                    disabled: desactive
                };
            });
        return { availableChanteurs }
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
     * reactivate un chanteur à une saison
     */
    async reactivate(chanteurId, saisonId) {
        // const saisonId = this.context.saisonId;
        console.log(
            "SaisonChanteurController.reactivate",
            saisonId,
            chanteurId


        );

        return this.service.reactivate(
            chanteurId,
            saisonId
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

    generateAccessLink(saisonchanteur) {
        console.log("generateAccessLink", saisonchanteur);
        return this.accesController.generateLink(saisonchanteur);
    }
    copyAccessLink(saisonChanteurs) {
        console.log(saisonChanteurs)
        const token = saisonChanteurs.acces.length ? saisonChanteurs.acces[0].token : 'aucun accès généré'
        navigator.clipboard.writeText(token);
    }
    async sendAccessLink(saisonChanteurs) {
        const result = await this.accesController.generateLink(saisonChanteurs);

        // pour l'instant console (on fera email étape 9)
        console.log("Lien à envoyer :", result.url);

        return result;
    }

}