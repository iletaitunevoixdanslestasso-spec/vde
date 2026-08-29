import React from "react";
import { createEntityConfig } from "./createEntityConfig";

import { ChansonRepository } from "../../repositories/ChansonRepository";
import { ChansonService } from "../../services/ChansonService";
import { ChansonValidator } from "../../validators/ChansonValidator";
import { ChansonMapper } from "../../mappers/ChansonMapper";
import { ChansonController } from "../../controllers/ChansonController";


const columns = [
    {
        field: "titre",
        header: "Titre",
        type: "text",
        required: true
    },
    // {
    //     field: "paroles",
    //     header: "paroles",
    //     type: "select",
    //     source: "availableReferentielDocumentParoles",
    //     required: true
    // },
    {
        hideInTable:true,
        field: "paroles",
        header: "Parole à mettre en ligne",
        type: "fileUploader",
        bucket: "referentiel-documents",
        accept: ".pdf,application/pdf",
        documentTypeCode: "paroles",
        // editType: "readonly",
        render: (v, row) => {
            let path = row?.referentiel_documents?.path || ''
            return `${path}`
        }


    },
    {
        mapped:false,
        field: "paroles_url",
        header: "Paroles",
        type: "text",
        hideInForm: true,

        render: (v, row) => {

            if (!v) {
                return "Aucune parole";
            }
            let path = row?.referentiel_documents?.path || ''
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


export const chansonConfig = createEntityConfig({

    entity: "chanson",

    title: "🎵 les Chansons",

    table: "chansons",


    Repository: ChansonRepository,
    Service: ChansonService,
    Validator: ChansonValidator,
    Mapper: ChansonMapper,
    Controller: ChansonController,


    columns,
    actions: [
        {
            label: "Pupitres",
            cssClass: "icon-pupitres",
            action: "managePupitres"
        }
    ]

});
