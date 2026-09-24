/**
 * le CRUD appelera ce controller pour gérer les accès
 */
import { AccesService } from "../services/AccesService";

export class AccesController {

    constructor() {
        this.service = new AccesService();
    }

    async generateLink(saisonchanteur) {
        console.error("AccesController.generateLink", saisonchanteur);
        return this.service.generateLink(saisonchanteur);
    }

}