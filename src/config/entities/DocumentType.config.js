import { createEntityConfig } from "./createEntityConfig";

import { DocumentTypeRepository } from "../../repositories/DocumentTypeRepository";
import { DocumentTypeService } from "../../services/DocumentTypeService";
import { DocumentTypeValidator } from "../../validators/DocumentTypeValidator";
import { DocumentTypeMapper } from "../../mappers/DocumentTypeMapper";


const columns = [

    // TODO ajouter les champs

];

const actions= [
];


export const DocumentTypeConfig = createEntityConfig({

    entity: "DocumentType",

    title: "TODO",

    table: "document_types",


    Repository: DocumentTypeRepository,
    Service: DocumentTypeService,
    Validator: DocumentTypeValidator,
    Mapper: DocumentTypeMapper,


    columns,
    actions

});
