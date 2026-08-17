import { ChanteurService } from "../services/ChanteurService";
import { AccesController } from "./AccesController";
import { BaseController } from "./BaseController";

export class ChanteurController extends BaseController {

    constructor(service) {
        super(service);
        this.accesController = new AccesController();
    }
    async loadItemByToken_chanteur() {

        return this.service.getByToken(
            this.context.token
        );

    }

    async prepareForm() {

        const saisonId = this.context.saisonId;


        const [groupesResult, pupitresResult] =
            await Promise.all([
                this.service.getAvailableGroupes(saisonId),
                this.service.getAvailablePupitres()
            ]);


        return {

            availableGroupes: groupesResult.success
                ? groupesResult.data.map(groupe => ({
                    id: groupe.id,
                    value: groupe.nom
                }))
                : [],

            availablePupitres: pupitresResult.success
                ? pupitresResult.data.map(pupitre => ({
                    id: pupitre.id,
                    value: pupitre.nom
                }))
                : []
        };
    }



    generateAccessLink(chanteur) {
        console.log("generateAccessLink", chanteur);
        return this.accesController.generateLink(chanteur);
    }
    copyAccessLink(link) {
        navigator.clipboard.writeText(link);
    }
    async sendAccessLink(chanteur) {
        console.log(chanteur)
        const result = await this.accesController.generateLink(chanteur);

        // pour l'instant console (on fera email étape 9)
        console.log("Lien à envoyer :", result.url);

        return result;
    }


    async validateDroitImage(row, load) {

        const result =
            await this.service.validateDroitImage(
                row.id
            );

        if (!result.success) {
            console.error(
                "validateDroitImage error",
                result
            );

            return;
        }

        load?.();
    }


    async rejectDroitImage(row, load) {

        const result =
            await this.service.rejectDroitImage(
                row.id
            );

        if (!result.success) {
            console.error(
                "rejectDroitImage error",
                result
            );

            return;
        }

        load?.();
    }
}