import { createEntityConfig } from "./createEntityConfig";

import { ChansonpupitreRepository } from "../../repositories/ChansonpupitreRepository";
import { ChansonpupitreService } from "../../services/ChansonpupitreService";
import { ChansonpupitreValidator } from "../../validators/ChansonpupitreValidator";
import { ChansonpupitreMapper } from "../../mappers/ChansonpupitreMapper";
import { ChansonpupitreController } from "../../controllers/ChansonpupitreController";


const columns = [
        {
            field: "pupitre_id",
            header: "Pupîtres",
            type: "select",
            source: "availablePupitres",
            required: true,
            render: (v, row) => {
                console.log(row)
                return `${row.pupitres.nom}`;
            }

        },
];

const actions= [
];


export const chansonpupitreConfig = createEntityConfig({

    entity: "chansonpupitre",

    title: "Les pupîtres",

    table: "chanson_pupitres",


    Repository: ChansonpupitreRepository,
    Service: ChansonpupitreService,
    Validator: ChansonpupitreValidator,
    Mapper: ChansonpupitreMapper,
    Controller:ChansonpupitreController,

    columns,
    actions

});
