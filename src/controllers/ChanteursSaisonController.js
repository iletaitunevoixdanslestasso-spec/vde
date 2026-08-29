import { ChanteurSaisonService } from "../services/ChanteurSaisonService";
import { ChanteurService } from "../services/ChanteurService";
import { MailService } from "../services/MailService";

import { AccesController } from "./AccesController";
import { BaseController } from "./BaseController";

export class ChanteursSaisonController extends BaseController {

    constructor(service) {
        super(service);
        this.accesController = new AccesController();
        this.mailService = new MailService();
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


        const [res, groupesRes] = await Promise.all([
            this.service.getAvailableChanteurs(saisonId),
            this.service.getAvailableGroupes(saisonId)
        ]);
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
        const availableGroupes = groupesRes.success
            ? groupesRes.data.map(groupe => ({
                id: groupe.id,
                value: groupe.nom
            }))
            : [];

        return { availableChanteurs, availableGroupes }
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
        const url = `${window.location.origin}/chanteur/${token}`;
        navigator.clipboard.writeText(url);
    }
    async sendAccessLink(saisonChanteurs) {
        console.log(saisonChanteurs)
        const result = await this.accesController.generateLink(saisonChanteurs);

        // pour l'instant console (on fera email étape 9)
        console.log("Lien à envoyer :", result.url);
        await this.mailService.sendInvitation(
            saisonChanteurs.chanteurs.email,
            result.url
        );
        await this.service.setEtat(
            saisonChanteurs.id,
            4
        );
        return result;
    }

}