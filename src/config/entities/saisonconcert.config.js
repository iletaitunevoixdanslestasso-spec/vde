import { createEntityConfig } from "./createEntityConfig";

import { SaisonconcertRepository } from "../../repositories/SaisonconcertRepository";
import { SaisonconcertService } from "../../services/SaisonconcertService";
import { SaisonconcertValidator } from "../../validators/SaisonconcertValidator";
import { SaisonconcertMapper } from "../../mappers/SaisonconcertMapper";
import { SaisonConcertController } from "../../controllers/SaisonConcertController";


const columns = [

    // TODO ajouter les champs

];

const actions= [
];


export const saisonconcertConfig = createEntityConfig({

    entity: "saisonconcert",

    title: "TODO",

    table: "saison_rendezvous",


    Repository: SaisonconcertRepository,
    Service: SaisonconcertService,
    Validator: SaisonconcertValidator,
    Mapper: SaisonconcertMapper,
    Controller: SaisonConcertController,

    columns,
    actions

});
