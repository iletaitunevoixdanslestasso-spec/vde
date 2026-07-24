import { createEntityConfig } from "./createEntityConfig";

import { SaisonchansonRepository } from "../../repositories/SaisonchansonRepository";
import { SaisonchansonService } from "../../services/SaisonchansonService";
import { SaisonchansonValidator } from "../../validators/SaisonchansonValidator";
import { SaisonchansonMapper } from "../../mappers/SaisonchansonMapper";


const columns = [
        {
            field: "chanson_id",
            header: "Chansons",
            type: "select",
            source: "availableChansons",
            required: true,
            render: (v, row) => {
                return `${row.chanons.titre}`
            }

        },

];

const actions= [
];


export const saisonchansonConfig = createEntityConfig({

    entity: "saisonchanson",

    title: "🎵 Chansons de la saison",

    table: "saison_chansons",


    Repository: SaisonchansonRepository,
    Service: SaisonchansonService,
    Validator: SaisonchansonValidator,
    Mapper: SaisonchansonMapper,


    columns,
    actions

});
