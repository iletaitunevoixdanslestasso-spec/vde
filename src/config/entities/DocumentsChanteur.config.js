import { createEntityConfig } from "./createEntityConfig";

import { DocumentsChanteurRepository } from "../../repositories/DocumentsChanteurRepository";
import { DocumentsChanteurService } from "../../services/DocumentsChanteurService";
import { DocumentsChanteurValidator } from "../../validators/DocumentsChanteurValidator";
import { DocumentsChanteurMapper } from "../../mappers/DocumentsChanteurMapper";
import { DocumentsChanteurController } from "../../controllers/DocumentsChanteurController";


const columns = [

    // TODO ajouter les champs

];

const actions= [
];


export const DocumentsChanteurConfig = createEntityConfig({

    entity: "DocumentsChanteur",

    title: "TODO",

    table: "documents",


    Repository: DocumentsChanteurRepository,
    Service: DocumentsChanteurService,
    Validator: DocumentsChanteurValidator,
    Mapper: DocumentsChanteurMapper,
    Controller: DocumentsChanteurController,


    columns,
    actions

});
