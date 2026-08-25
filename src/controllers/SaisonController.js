import { BaseController } from "./BaseController";
import { SaisonService } from "../services/SaisonService";

export class SaisonController extends BaseController {
    
    constructor(service) {
        super(service);
    }
  
    getActive(onSuccess, onError) {

        return this.handle(
            () => this.service.getActive(),
            { onSuccess, onError }
        );
    }

    activate(saison, onSuccess, onError) {

        return this.handle(
            () => this.service.setActive(saison.id),
            {
                onSuccess: () => {
                    this.context?.refresh();
                    onSuccess?.(saison);
                },
                onError
            }
        );
    }

    async save(entity, onSuccess, onError) {
        return super.save(
            entity,
            (data) => {
                // Si la saison modifiée est la saison active,
                // on demande au contexte de la recharger
                console.log(data)
                console.log(this.context)
                this.context?.refresh();
                onSuccess?.(data);
            },
            onError
        );
    }

    manageChanteurs(saison, load) {

        console.log(
            "SaisonController.manageChanteurs",
            saison
        );
        this.context.updateSaisonSelectionne(saison);
        return (`/admin/${saison.nom}/chanteurs`);

    }

}