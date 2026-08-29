import { createEntityConfig } from "./createEntityConfig";

import { SaisonConcertChansonRepository } from "../../repositories/SaisonConcertChansonRepository";
import { SaisonConcertChansonService } from "../../services/SaisonConcertChansonService";
import { SaisonConcertChansonValidator } from "../../validators/SaisonConcertChansonValidator";
import { SaisonConcertChansonMapper } from "../../mappers/SaisonConcertChansonMapper";
import { SaisonConcertChansonController } from "../../controllers/SaisonConcertChansonController";


const columns = [
    {
        field: "saison_chanson_id",
        header: "Chansons",
        type: "select",
        source: "availableChansons",
        required: true,
        render: (v, row) => {
            return `${row?.saison_chansons?.chansons?.titre}`
        }

    },
        // {
        //     mapped:false,
        //     field: "paroles_url",
        //     header: "Paroles",
        //     type: "text",
        //     hideInForm: true,
    
        //     render: (v, row) => {

        //         if (!v) {
        //             return "Aucune parole";
        //         }
        //         let path = row?.saison_chansons?.chansons?.referentiel_documents?.path || ''
        //         return React.createElement(
        //             "a",
        //             {
        //                 href: v,
        //                 target: "_blank",
        //                 rel: "noopener noreferrer"
        //             },
        //             `📄 ${path}`
        //         );
        //     }
        // },

];


const actions = [

    { 
        label: "Répartition", 
        title: "affichage de la Répartition", 
        cssClass: "icon-groupes", 
        action: "repartition"
    },

];


export const SaisonConcertChansonConfig = createEntityConfig({

    entity: "SaisonConcertChanson",

    title: "Les chansons",

    table: "saison_concert_chansons",


    Repository: SaisonConcertChansonRepository,
    Service: SaisonConcertChansonService,
    Validator: SaisonConcertChansonValidator,
    Mapper: SaisonConcertChansonMapper,
    Controller: SaisonConcertChansonController,


    columns,
    actions

});
