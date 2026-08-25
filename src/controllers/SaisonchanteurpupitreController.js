import { BaseController } from "./BaseController";

export class SaisonChanteurPupitreController extends BaseController {

    constructor(service) {
        super(service);
    }

    getMesChansons(token, saisonId, chanteurId, onSuccess, onError) {

        return this.handle(
            () => this.service.getMesChansons(
                token,
                saisonId,
                chanteurId
            ),
            {
                onSuccess,
                onError
            }
        );
    }

    savePupitre(
        token,
        saisonId,
        chanteurId,
        chansonId,
        pupitreId,
        onSuccess,
        onError
    ) {
        console.log("CONTROLLER SAVE PUPITRE", {
            token,
            saisonId,
            chanteurId,
            chansonId,
            pupitreId,
        });
        return this.handle(
            () => this.service.savePupitre(
                token,
                saisonId,
                chanteurId,
                chansonId,
                pupitreId
            ),
            {
                onSuccess,
                onError
            }
        );
    }
}