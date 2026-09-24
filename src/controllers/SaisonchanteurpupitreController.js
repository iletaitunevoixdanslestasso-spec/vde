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
        console.error("CONTROLLER SAVE PUPITRE", {
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
    async saveLead(
        token,
        saisonId,
        chanteurId,
        saisonChansonId,
        lead,
        onSuccess,
        onError
    ) {
        console.error(
            token,
            saisonId,
            chanteurId,
            saisonChansonId,
            lead,
            onSuccess,
            onError
        )
        try {

            const result =
                await this.service.saveLead(
                    token,
                    saisonChansonId,
                    lead
                );


            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Impossible de modifier le lead."
                );
            }


            if (onSuccess) {
                onSuccess(result.data);
            }


            return result;

        } catch (error) {

            console.error(
                "Erreur saveLead",
                error
            );


            if (onError) {
                onError(error);
            }


            return {
                success: false,
                message: error.message
            };
        }
    }
}