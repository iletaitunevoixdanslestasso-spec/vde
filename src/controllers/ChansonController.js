import { Navigate } from "react-router-dom";
import { BaseController } from "./BaseController";


export class ChansonController extends BaseController {

    constructor(service) {
        super(service);
    }
    
    managePupitres(chanson, load) {

        
        console.log(
            "ChansonController.managePupitres",
            chanson
        );

        return (`/admin//chanson/${chanson.titre}/pupitres`);

        return (`/admin/chanson/${saison.nom}/chanteurs`);

    }

    async prepareForm() {

        const result =
            await this.service.getAvailableReferentielDocumentParoles();

        return {
            availableReferentielDocumentParoles: result.success
                ? result.data.map(type => ({
                    id: type.id,
                    value: type.titre
                }))
                : []
        };
    }    
}
