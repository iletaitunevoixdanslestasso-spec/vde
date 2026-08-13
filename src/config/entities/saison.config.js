import { createEntityConfig } from "./createEntityConfig";

import { SaisonRepository } from "../../repositories/SaisonRepository";
import { SaisonService } from "../../services/SaisonService";
import { SaisonValidator } from "../../validators/SaisonValidator";
import { SaisonMapper } from "../../mappers/SaisonMapper";
import { SaisonController } from "../../controllers/SaisonController";

    const actions = [
        { label: "⭐ Activer", action: "activate" },
        // { label: "👥 Chanteurs", action: "manageChanteurs" },
    ];

    const columns= [
        { field: "nom", header: "Nom", type: "text" , required:true},
        { field: "date_debut", header: "Début", type: "date" , required:true},
        { field: "date_fin", header: "Fin", type: "date" , required:true},
        {
            field: "active",
            header: "Active",
            type: "boolean",
            hideInForm: true,
            render: (v) => (v ? "⭐" : "")
        }
    ];   

export const saisonConfig = createEntityConfig({
    entity: "saisons",
    title: "📅 Saisons",
    table: "saisons",
    Repository: SaisonRepository,
    Service: SaisonService,
    Validator: SaisonValidator,
    Mapper: SaisonMapper,
    Controller: SaisonController,
    // ⭐ hooks optionnels
    hooks: {
        beforeSave: (form) => {
            if (form.dateDebut > form.dateFin) {
                throw new Error("Dates invalides");
            }
            return form;
        }
    },

    // ⭐ actions custom (IMPORTANT)
    columns,
    actions
});