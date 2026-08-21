import { createEntityConfig } from "./createEntityConfig";

import { RepetitionstypeRepository } from "../../repositories/RepetitionstypeRepository";
import { RepetitionstypeService } from "../../services/RepetitionstypeService";
import { RepetitionstypeValidator } from "../../validators/RepetitionstypeValidator";
import { RepetitionstypeMapper } from "../../mappers/RepetitionstypeMapper";


const columns = [

    // TODO ajouter les champs

];

const actions= [
];


export const repetitionstypeConfig = createEntityConfig({

    entity: "repetitionstype",

    title: "TODO",

    table: "repetitionstype",


    Repository: RepetitionstypeRepository,
    Service: RepetitionstypeService,
    Validator: RepetitionstypeValidator,
    Mapper: RepetitionstypeMapper,


    columns,
    actions

});
