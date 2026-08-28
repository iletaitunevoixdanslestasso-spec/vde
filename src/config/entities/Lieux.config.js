import { createEntityConfig } from "./createEntityConfig";

import { LieuxRepository } from "../../repositories/LieuxRepository";
import { LieuxService } from "../../services/LieuxService";
import { LieuxValidator } from "../../validators/LieuxValidator";
import { LieuxMapper } from "../../mappers/LieuxMapper";


const columns = [
    { field: "nom", header: "Nom", type: "text" },
    { field: "rue", header: "Numéro et rue", type: "text" },
    { field: "ville", header: "Ville", type: "text", required: true },
    { field: "code_postale", header: "Code postal", type: "text" },
    { field: "description", header: "Description", type: "textarea" },
    { field: "geolocalisation", header: "Géolocalisation", type: "text" },
    // TODO ajouter les champs

];

const actions = [
];


export const LieuxConfig = createEntityConfig({

    entity: "Lieux",

    title: "Gestion des lieux",

    table: "lieux",


    Repository: LieuxRepository,
    Service: LieuxService,
    Validator: LieuxValidator,
    Mapper: LieuxMapper,


    columns,
    actions

});
