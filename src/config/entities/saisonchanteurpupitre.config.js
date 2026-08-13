import { createEntityConfig } from "./createEntityConfig";

import { SaisonChanteurPupitreRepository } from "../../repositories/SaisonChanteurPupitreRepository.js";
import { SaisonChanteurPupitreService } from "../../services/SaisonchanteurpupitreService";
import { SaisonchanteurpupitreValidator } from "../../validators/SaisonchanteurpupitreValidator";
import { SaisonchanteurpupitreMapper } from "../../mappers/SaisonchanteurpupitreMapper";
import { SaisonChanteurPupitreController } from "../../controllers/SaisonchanteurpupitreController";


const columns = [

    // TODO ajouter les champs

];

const actions= [
];


export const saisonchanteurpupitreConfig = createEntityConfig({

    entity: "saisonchanteurpupitre",

    title: "Mes pupitres",

    table: "saison_chanteur_pupitres",


    Repository: SaisonChanteurPupitreRepository,
    Service: SaisonChanteurPupitreService,
    Validator: SaisonchanteurpupitreValidator,
    Mapper: SaisonchanteurpupitreMapper,
    Controller: SaisonChanteurPupitreController,

    columns,
    actions

});
