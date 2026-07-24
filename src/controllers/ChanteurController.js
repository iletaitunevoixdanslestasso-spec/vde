import { ChanteurService } from "../services/ChanteurService";
import { AccesController } from "./AccesController";
import { BaseController } from "./BaseController";

export class ChanteurController extends BaseController {

    constructor(service) {
        super(service);
        this.accesController = new AccesController();
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

}