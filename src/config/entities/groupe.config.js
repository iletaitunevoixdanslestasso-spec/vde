import { createEntityConfig } from "./createEntityConfig";

import { GroupeRepository } from "../../repositories/GroupeRepository";
import { GroupeService } from "../../services/GroupeService";
import { GroupeValidator } from "../../validators/GroupeValidator";
import { GroupeMapper } from "../../mappers/GroupeMapper";
import { GroupesController } from "../../controllers/GroupesController";


const columns = [
    {
        field: "nom",
        header: "Nom",
        type: "text",
        required: true
    },
    {
        field: "description",
        header: "Horaire",
        type: "text",
    }

];

const actions= [
];


export const groupeConfig = createEntityConfig({

    entity: "groupe",

    title: "TODO",

    table: "groupes",


    Repository: GroupeRepository,
    Service: GroupeService,
    Validator: GroupeValidator,
    Mapper: GroupeMapper,
    Controller:GroupesController,

    columns,
    actions

});
