import { createEntityConfig } from "./createEntityConfig";

import { ChansonpupitreRepository } from "../../repositories/ChansonpupitreRepository";
import { ChansonpupitreService } from "../../services/ChansonpupitreService";
import { ChansonpupitreValidator } from "../../validators/ChansonpupitreValidator";
import { ChansonpupitreMapper } from "../../mappers/ChansonpupitreMapper";
import { ChansonpupitreController } from "../../controllers/ChansonpupitreController";
import React from "react";


const columns = [
    {
        field: "pupitre_id",
        header: "Pupitres",
        type: "select",
        source: "availablePupitres",
        editType: "readonly",
        required: true,
        render: (v, row) => {
            console.log(row)
            return `${row.pupitres.nom}`;
        }

    },
    {
        field: "audio_url", header: "Audio", type: "text",
        render: (v, row) => {

            if (!v) {
                return "Aucun son";
            }
            let path = row?.referentiel_documents?.path || ''
            return React.createElement(
                "a",
                {
                    href: v,
                    target: "_blank",
                    rel: "noopener noreferrer"
                },
                `${v}`
            );
        },
    }
];

const actions = [
];


export const chansonpupitreConfig = createEntityConfig({

    entity: "chansonpupitre",

    title: "Les pupitres",

    table: "chanson_pupitres",


    Repository: ChansonpupitreRepository,
    Service: ChansonpupitreService,
    Validator: ChansonpupitreValidator,
    Mapper: ChansonpupitreMapper,
    Controller: ChansonpupitreController,

    columns,
    actions

});
