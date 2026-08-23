import { createEntityConfig } from "./createEntityConfig";

import { ConcertRepository } from "../../repositories/ConcertRepository";
import { ConcertService } from "../../services/ConcertService";
import { ConcertValidator } from "../../validators/ConcertValidator";
import { ConcertMapper } from "../../mappers/ConcertMapper";


const columns = [
    { field: "titre", header: "Titre", type: "text" },

    { field: "date", header: "Date", type: "date" },
    {
        field: "rendezvous_type_id",
        header: "typerendezvous",
        // type: "hidden",
        hideInForm: true,
        hideInTable: true

    },
    {
        field: "lieu_mode",
        header: "Lieu",
        type: "select",
        options: [
            { value: "existant", label: "Choisir un lieu existant" },
            { value: "nouveau", label: "Créer un nouveau lieu" }
        ]
    },

    {
        field: "lieu_id",
        header: "Lieu existant",
        type: "select",
        source: "lieux",
        hideInTable: true,
        dependsOn: {
            field: "lieu_mode",
            value: "existant"
        }
    },

    {
        field: "lieu_nom",
        header: "Nom",
        type: "text",
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            console.log(row)
            if (!row.lieux)
                return ``
            return `${row?.lieux?.nom || ''}`
        },
        sortValue: (row) => {
            if (!row.lieux)
                return ''
            return `${row?.lieux.nom || ''}  `;
        }

    },

    {
        field: "lieu_rue",
        header: "Rue",
        type: "text",
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.rue || ''}`
        },
        sortValue: (row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.rue || ''}`;
        },

    },

    {
        field: "lieu_ville",
        header: "Ville",
        type: "text",
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.ville || ''}`
        },
        sortValue: (row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.ville || ''}`;
        },

    },

    {
        field: "lieu_code_postale",
        header: "Code postal",
        type: "text",
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.code_postale || ''}`
        },
        sortValue: (row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.code_postale || ''}`;
        },

    },

    {
        field: "lieu_description",
        header: "Description du lieu",
        type: "textarea",
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.description || ''}`
        },
        sortValue: (row) => {
            if(!row.lieux)
                return ''
            return `${row?.lieux.description || ''}`;
        },

    }
];


export const concertConfig = createEntityConfig({

    entity: "concert",

    title: "🎤 les Concerts",

    table: "rendezvous",


    Repository: ConcertRepository,
    Service: ConcertService,
    Validator: ConcertValidator,
    Mapper: ConcertMapper,


    columns

});
