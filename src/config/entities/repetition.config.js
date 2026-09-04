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
        field: "description",
        header: "Description",
        type: "textarea",
    },


];
const actions = [
    {
        label: "Chanteurs",
        title: "Chanteurs",
        cssClass: "icon-groupes",
        action: "manageSaisonRepetitionChanteur"
    },
    {
        label: "Chansonpoubrrzls",
        title: "Chansonpoubrrzl",
        cssClass: "icon-chanson",
        action: "manageSaisonConcertChanson"
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
