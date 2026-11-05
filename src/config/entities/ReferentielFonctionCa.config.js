import { createEntityConfig } from "./createEntityConfig";
import { ReferentielFonctionCaRepository } from "../../repositories/ReferentielFonctionCaRepository";
import { ReferentielFonctionCaService } from "../../services/ReferentielFonctionCaService";
import { ReferentielFonctionCaController } from "../../controllers/ReferentielFonctionCaController";
import { ReferentielFonctionCaValidator } from "../../validators/ReferentielFonctionCaValidator";

export const ReferentielFonctionCaConfig = createEntityConfig({
    entity: "fonctionCa",
    title: "Fonctions du conseil d’administration",
    table: "referentiel_fonction_ca",
    icon: "groupe",
    countLabel: { singular: "fonction", plural: "fonctions" },
    Repository: ReferentielFonctionCaRepository,
    Service: ReferentielFonctionCaService,
    Controller: ReferentielFonctionCaController,
    Validator: ReferentielFonctionCaValidator,
    columns: [
        {
            field: "libelle",
            header: "Libellé",
            type: "text",
            required: true
        },
        {
            field: "ordre",
            header: "Ordre",
            type: "number",
            min: 0,
            max: 2147483647,
            step: 1,
            placeholder: "1000"
        }
    ]
});
