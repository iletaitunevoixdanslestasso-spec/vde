import { createEntityConfig } from "./createEntityConfig";

import { SaisonchansonRepository } from "../../repositories/SaisonchansonRepository";
import { SaisonchansonService } from "../../services/SaisonchansonService";
import { SaisonchansonValidator } from "../../validators/SaisonchansonValidator";
import { SaisonchansonMapper } from "../../mappers/SaisonchansonMapper";
import {  SaisonChansonController } from "../../controllers/SaisonChansonController";


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

];


const actions= [
    { label: "🎼 Répartition", action: "repartition" },
    { label: "🗑 Supprimer", action: "delete" },
];


export const saisonchansonConfig = createEntityConfig({

    entity: "saisonchanson",

    title: "🎵 Chansons de la saison",

    table: "saison_chansons",


    Repository: SaisonchansonRepository,
    Service: SaisonchansonService,
    Validator: SaisonchansonValidator,
    Mapper: SaisonchansonMapper,
    Controller:SaisonChansonController,

    columns,
    useBaseActions:false,
    actions

});
