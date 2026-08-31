import { createEntityConfig } from "./createEntityConfig";

import { InvitationRepository } from "../../repositories/InvitationRepository";
import { InvitationService } from "../../services/InvitationService";
import { InvitationValidator } from "../../validators/InvitationValidator";
import { InvitationMapper } from "../../mappers/InvitationMapper";


const columns = [
    {
        field: "rendezvous_type_id",
        header: "Type",
        type: "select",
        required:true,
        source: "rendezvous_type",
        render: (v, row) => row?.rendezvous_type?.libelle || '',
        sortValue: (row) => {
            if (!row?.rendezvous_type?.libelle)
                return ''
            return `${row?.rendezvous_type?.libelle || ''}  `;
        }        
    },

    { field: "titre", header: "Titre", type: "text" },

    { field: "date", header: "Date", type: "date" , 
        render: (value) => {
        if (!value) {
            return "";
        }

        return new Date(value).toLocaleDateString("fr-FR");
    }},
    { field: "description", header: "infos", type: "textarea" },
    { field: "heure_rdv", header: "rdv", type: "time" },
    {
        field: "lieu_mode",
        header: "Lieu",
        type: "select",
        hideInTable: true,
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
        render: (v, row) => row.lieux?.nom || '',
        // render: (v, row) => {
        //     console.log(row)
        //     if (!row.lieux)
        //         return ``
        //     return `${row?.lieux?.nom || ''}`
        // },
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
        header: "le lieu",
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


const actions= [
];


export const invitationConfig = createEntityConfig({

    entity: "invitation",

    title: "TODO",

    table: "rendezvous",


    Repository: InvitationRepository,
    Service: InvitationService,
    Validator: InvitationValidator,
    Mapper: InvitationMapper,


    columns,
    actions

});
