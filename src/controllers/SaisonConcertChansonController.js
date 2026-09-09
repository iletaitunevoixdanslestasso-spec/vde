import { BaseController } from "./BaseController";


export class SaisonConcertChansonController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm() {

        const saisonId = this.context.saisonId;
        const saisonConcertId = this.context.saisonConcertId;

        const res = await this.service.getAvailableChansons(
            saisonId,
            saisonConcertId
        );

        if (!res.success) {
            return {};
        }

        const availableChansons = res.data
            .sort((a, b) => {

                // Les désactivées toujours à la fin
                if (a.desactivee && !b.desactivee) {
                    return 1;
                }

                if (!a.desactivee && b.desactivee) {
                    return -1;
                }

                // Même catégorie → ordre alphabétique
                return a.chansons.titre.localeCompare(
                    b.chansons.titre,
                    "fr",
                    { sensitivity: "base" }
                );
            })
            .map(chanson => {

                const titre = chanson.chansons.titre;

                return {
                    id: chanson.id,
                    value: chanson.desactivee
                        ? `${titre} (désactivée)`
                        : titre,
                };
            });

        return { availableChansons };
    }
    async updateOrdres(rows) {
        return this.service.updateOrdres(rows);
    }
}
