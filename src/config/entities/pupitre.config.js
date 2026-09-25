import { createEntityConfig } from "./createEntityConfig";

import { PupitreRepository } from "../../repositories/PupitreRepository";
import { PupitreService } from "../../services/PupitreService";
import { PupitreValidator } from "../../validators/PupitreValidator";
import { PupitreMapper } from "../../mappers/PupitreMapper";


const columns = [
{ field: "nom", header: "Nom", type: "text", required: true },
];

const actions= [
];


export const pupitreConfig = createEntityConfig({
    entity: "pupitre",
    title: "les Pupitres",
    table: "pupitres",
    Repository: PupitreRepository,
    Service: PupitreService,
    Validator: PupitreValidator,
    Mapper: PupitreMapper,
    columns,
    actions
});
