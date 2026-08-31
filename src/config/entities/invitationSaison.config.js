import { createEntityConfig } from "./createEntityConfig";

import { InvitationSaisonRepository } from "../../repositories/InvitationSaisonRepository";
import { InvitationSaisonService } from "../../services/InvitationSaisonService";
import { InvitationSaisonValidator } from "../../validators/InvitationSaisonValidator";
import { InvitationSaisonMapper } from "../../mappers/InvitationSaisonMapper";


const columns = [

    // TODO ajouter les champs

];

const actions= [
];


export const invitationSaisonConfig = createEntityConfig({

    entity: "invitationSaison",

    title: "TODO",

    table: "invitationSaison",


    Repository: InvitationSaisonRepository,
    Service: InvitationSaisonService,
    Validator: InvitationSaisonValidator,
    Mapper: InvitationSaisonMapper,


    columns,
    actions

});
