import { createEntityConfig } from "./createEntityConfig";

import { ReferentielDocumentRepository } from "../../repositories/ReferentielDocumentRepository";
import { ReferentielDocumentService } from "../../services/ReferentielDocumentService";
import { ReferentielDocumentValidator } from "../../validators/ReferentielDocumentValidator";
import { ReferentielDocumentMapper } from "../../mappers/ReferentielDocumentMapper";
import FileUploader from "../../core/framework/FileUploader";
import { ReferentielDocumentController } from "../../controllers/ReferentielDocumentController";
import React from "react";


const columns = [
    {
        field: "titre",
        header: "Titre",
        type: "text",
        required: true,
    },

    {
        field: "document_type_id",
        header: "Type de document",
        type: "select",
        source: "availableDocumentTypes",
        required: true,
        render: (v, row) => {
            let path = row?.document_types?.libelle || ''
            return `${path}`
        },
        editType: "readonly",
    },
    
    {
        field: "path",
        header: "Document",
        type: "fileUploader",
        bucket: "referentiel-documents",
        accept: ".pdf,application/pdf",
        editType: "readonly",
        hideInTable: true,
        // required: true,

    },
    {
        mapped: false,
        field: "document_url",
        header: "Document 2",
        type: "text",
        hideInForm: true,

        render: (v, row) => {

            if (!v) {
                return "Aucune parole";
            }
            let path = row?.path || ''
            return React.createElement(
                "a",
                {
                    href: v,
                    target: "_blank",
                    rel: "noopener noreferrer"
                },
                `📄 ${path}`
            );
        }
    }
];

const actions = [
];


export const ReferentielDocumentConfig = createEntityConfig({

    entity: "ReferentielDocument",

    title: "Documents",

    table: "referentiel_documents",


    Repository: ReferentielDocumentRepository,
    Service: ReferentielDocumentService,
    Validator: ReferentielDocumentValidator,
    Mapper: ReferentielDocumentMapper,
    Controller: ReferentielDocumentController,


    columns,
    actions

});
