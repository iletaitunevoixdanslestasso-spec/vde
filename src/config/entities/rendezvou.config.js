import { createEntityConfig } from "./createEntityConfig";

import { RendezvouRepository } from "../../repositories/RendezvouRepository";
import { RendezvouService } from "../../services/RendezvouService";
import { RendezvouValidator } from "../../validators/RendezvouValidator";
import { RendezvouMapper } from "../../mappers/RendezvouMapper";


const columns = [

    // TODO ajouter les champs

];

const actions= [
];


export const rendezvouConfig = createEntityConfig({

    entity: "rendezvou",

    title: "TODO",

    table: "rendezvous",


    Repository: RendezvouRepository,
    Service: RendezvouService,
    Validator: RendezvouValidator,
    Mapper: RendezvouMapper,


    columns,
    actions

});
