import { createEntityConfig } from "./createEntityConfig";

import { SaisonchansonRepository } from "../../repositories/SaisonchansonRepository";
import { SaisonchansonService } from "../../services/SaisonchansonService";
import { SaisonchansonValidator } from "../../validators/SaisonchansonValidator";
import { SaisonchansonMapper } from "../../mappers/SaisonchansonMapper";
import { SaisonchansonController } from "../../controllers/SaisonchansonController";
import React from "react";

const columns = [
    {
        field: "chanson_id",
        header: "Chansons",
        type: "select",
        source: "availableChansons",
        required: true,
        render: (v, row) => {
            return `${row.chansons.titre}`
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
                let path = row?.chansons.referentiel_documents?.path || ''
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
        },

];


const actions = [
    {
        label: "Pupitres",
        cssClass: "icon-pupitres",
        action: "manageSaisonChansonPupitres"
    },
    { 
        label: "Répartition", 
        title: "affichage de la Répartition", 
        cssClass: "icon-chanteursaison", 
        action: "repartition" },
    {
        title: "Supprimer",
        action: "delete",
        cssClass: "icon-delete"
    },
];

const designation = "chanson"

export const saisonchansonConfig = createEntityConfig({

    entity: "saisonchanson",
    icon: designation,
    title: "Chansons de la saison",
    countLabel : {
        plural: `${designation}s`,
        singular: designation,
    },
    table: "saison_chansons",


    Repository: SaisonchansonRepository,
    Service: SaisonchansonService,
    Validator: SaisonchansonValidator,
    Mapper: SaisonchansonMapper,
    Controller: SaisonchansonController,

    columns,
    useBaseActions: false,
    actions

});
