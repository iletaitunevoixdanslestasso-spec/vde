import { createEntityConfig } from "./createEntityConfig";

import { RepetitionRepository } from "../../repositories/RepetitionRepository";
import { RepetitionService } from "../../services/RepetitionService";
import { RepetitionValidator } from "../../validators/RepetitionValidator";
import { RepetitionMapper } from "../../mappers/RepetitionMapper";
import { RepetitionController } from "../../controllers/RepetitionController";
import { formatDate, formatDuration } from "../../helper/helper";



const columns = [
    {
        field: "date",
        header: "Jour",
        type: "date",
        render: (v, row) => {
            return `${formatDate(row.date)}`
        },
        sortValue: (row) => {
            return row.date;
        }

    },

    {
        field: "rendezvous_id",
        header: "Rendez-vous",
        type: "hidden",
        render: (v, row) => {
            console.log(row)
            // const token = row.acces.length ? row.acces[0].token : ''
            return `${row.rendezvous.description}`
        },
        hideInTable: true,
        hideInForm: true,

    },
    {
        field: "saison_id",
        header: "saison",
        // type: "hidden",
        hideInForm: true,
        hideInTable: true

    },
    {
        field: "repetitions_type_id",
        header: "Type",
        type: "select",
        required: true,
        source: "availableType",
        render: (v, row) => {
            return `${row.repetitions_type.libelle}`
        },
        sortValue: (row) => {
            return row.repetitions_type.libelle;
        }


    },

    {
        field: "duree",
        header: "duree",
        mapped: false,
        hideInForm: true,
        type: "text",
        render: (v, row) => {
            return `${formatDuration(row.repetitions_type.duree)}`
        },
        sortValue: (row) => {
            return row.repetitions_type.duree;
        }


    },
    {
        field: "accompagne",
        header: "Accompagnée",
        type: "checkbox",
        render: (v, row) => {
            if (!row.accompagne)
                return ''
            return {
                title: "oui",
                cssClass: "icon-checked"
            };
        },
        sortValue: (row) => {
            return row.accompagne ?? 0;
        },
    },
    {
        field: "lieu_mode",
        header: "Lieu",
        type: "select",
         mapped: false,
        hideInTable: true,
        options: [
            { value: "repetion", label: "lieu de répétition par défaut" },
            { value: "existant", label: "Choisir un lieu existant" },
            { value: "nouveau", label: "Créer un nouveau lieu" }
        ]
    },

    {
        field: "lieu_id",
        mapped: false,
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
            let rendezvous = row.rendezvous ?? false
            return rendezvous?.lieux?.nom || ''
        },
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
        hideInTable: true,
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            if (!row.lieux)
                return ''
            return `${row?.lieux.rue || ''}`
        },
        sortValue: (row) => {
            if (!row.lieux)
                return ''
            return `${row?.lieux.rue || ''}`;
        },

    },

    {
        field: "lieu_ville",
        header: "Ville",
        hideInTable: true,
        type: "text",
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            let rendezvous = row.rendezvous ?? false
            console.log("rendezvous",rendezvous)
            if (!rendezvous.lieux)
                return ''
            return `${rendezvous.lieux.ville || ''}`
        },
        sortValue: (row) => {
            if (!row.lieux)
                return ''
            return `${row?.lieux.ville || ''}`;
        },

    },

    {
        field: "lieu_code_postale",
        header: "Code postal",
        hideInTable: true,
        type: "text",
        dependsOn: {
            field: "lieu_mode",
            value: "nouveau"
        },
        render: (v, row) => {
            if (!row.lieux)
                return ''
            return `${row?.lieux.code_postale || ''}`
        },
        sortValue: (row) => {
            if (!row.lieux)
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
            let rendezvous = row.rendezvous ?? false
            if (!rendezvous?.lieux)
                return ''
            return `${rendezvous?.lieux?.description || ''}`
        },
        sortValue: (row) => {
            if (!row.lieux)
                return ''
            return `${row?.lieux.description || ''}`;
        },

    },
    {
        field: "description",
        header: "Description",
        type: "textarea",
    },
    {
        field: "presence",
        header: "P / N / A",
        mapped: false,
        hideInForm: true,
        type: "text",
        render: (v, row) => {
            return `${row.presents} / ${row.ne_sait_pas} / ${row.absents}`
        },
        sortValue: (row) => {
            return row.presents ?? 0;
        },
    },


];
const actions = [
    {
        label: "Chanteurs",
        title: "Chanteurs",
        cssClass: "icon-groupes",
        action: "manageSaisonRepetitionChanteur"
    },

]


export const repetitionConfig = createEntityConfig({

    entity: "repetition",

    title: "🗓 les Répétitions",

    table: "repetitions",


    Repository: RepetitionRepository,
    Service: RepetitionService,
    Validator: RepetitionValidator,
    Mapper: RepetitionMapper,
    Controller: RepetitionController,

    columns,
    actions

});
