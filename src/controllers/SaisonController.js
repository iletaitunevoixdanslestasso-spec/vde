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

    async prepareForm() {

        const saisonId = this.context.saisonId;


        const [res] = await Promise.all([
            this.service.getAvailableAdherents(),
        ]);
        if (!res.success) {
            return {};
        }
        const availableAdherents = res.data
            .sort((a, b) => {

                const nom = a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
                if (nom !== 0) return nom;

                return `${nom} ${a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" })}`;
            })
            .map(chanteur => {
                return {
                    id: chanteur.id,
                    value: `${chanteur.nom} ${chanteur.prenom}`
                };
            });

        console.log("availableAdherents", availableAdherents)

        return { availableAdherents }
    }

    async save(entity, onSuccess, onError) {
        return super.save(
            entity,
            (data) => {
                // Si la saison modifiée est la saison active,
                // on demande au contexte de la recharger
                console.error(data)
                console.error(this.context)
                this.context?.refresh();
                onSuccess?.(data);
            },
            onError
        );
    }

    manageChanteurs(saison, load) {

        console.error(
            "SaisonController.manageChanteurs",
            saison
        );
        this.context.updateSaisonSelectionne(saison);
        return (`/admin/${saison.nom}/chanteurs`);

    }

}