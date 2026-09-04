import { BaseController } from "./BaseController";


export class SaisonrepetitionchanteurController extends BaseController {

    constructor(service) {
        super(service);
    }
    async load(onSuccess, onError) {
        console.log("SaisonConcertController")
        return this.handle(
            () => this.service.findBySaisonAndRepetition(),
            { onSuccess, onError }
        );
    }
    async saveParticipation(
        repetitionId,
        saisonChanteurId,
        participe
    ) {
        try {

            const data =
                await this.service.saveParticipation(
                    repetitionId,
                    saisonChanteurId,
                    participe
                );

            return {
                success: true,
                data,
                message: "Participation enregistrée."
            };

        } catch (error) {

            console.error(
                "saveParticipation",
                error
            );

            return {
                success: false,
                message:
                    error.message ||
                    "Erreur lors de l'enregistrement."
            };
        }
    }
}
