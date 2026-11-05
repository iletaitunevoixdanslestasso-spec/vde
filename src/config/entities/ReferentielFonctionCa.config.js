import { createEntityConfig } from "./createEntityConfig";
import { ReferentielFonctionCaRepository } from "../../repositories/ReferentielFonctionCaRepository";
import { ReferentielFonctionCaService } from "../../services/ReferentielFonctionCaService";
import { ReferentielFonctionCaController } from "../../controllers/ReferentielFonctionCaController";

export const ReferentielFonctionCaConfig = createEntityConfig({
    entity: "fonctionCa",
    title: "Fonctions du conseil d’administration",
    table: "referentiel_fonction_ca",
    icon: "groupe",
    countLabel: { singular: "fonction", plural: "fonctions" },
    Repository: ReferentielFonctionCaRepository,
    Service: ReferentielFonctionCaService,
    Controller: ReferentielFonctionCaController,
    columns: [
        {
            field: "libelle",
            header: "Libellé",
            type: "text",
            required: true
        }
    ]
});
