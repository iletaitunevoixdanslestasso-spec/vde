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

const designation = 'invitation'
export const invitationSaisonConfig = createEntityConfig({

    entity: "invitationSaison",

    title: "TODO",
    icon:designation,
    countLabel : {
        singular: designation,
    },

    table: "invitationSaison",


    Repository: InvitationSaisonRepository,
    Service: InvitationSaisonService,
    Validator: InvitationSaisonValidator,
    Mapper: InvitationSaisonMapper,


    columns,
    actions

});
