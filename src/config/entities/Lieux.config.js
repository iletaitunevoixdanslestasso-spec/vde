import { createEntityConfig } from "./createEntityConfig";

import { LieuxRepository } from "../../repositories/LieuxRepository";
import { LieuxService } from "../../services/LieuxService";
import { LieuxValidator } from "../../validators/LieuxValidator";
import { LieuxMapper } from "../../mappers/LieuxMapper";
import { LieuxController } from "../../controllers/LieuxController";


const columns = [

    {
        field: "nom",
        header: "Nom",
        type: "text"
    },

    {
        field: "rue",
        header: "Numéro et rue",
        type: "text"
    },

    {
        field: "ville",
        header: "Ville",
        type: "text",
        required: true
    },

    {
        field: "code_postale",
        header: "Code postal",
        type: "text"
    },

    {
        field: "description",
        header: "Description",
        type: "textarea"
    },

    {
        field: "geolocalisation",
        header: "Géolocalisation",
        type: "text"
    }

];


const actions = [

    {
        action: "pourRepetition",
        label: "Pour répétitions",
        title: "Définir comme lieu de répétition",

        /*
         * Le bouton existe uniquement
         * tant qu'AUCUN lieu n'est déjà
         * défini pour les répétitions.
         */
        condition: (row, data) => {
            console.log(row, data)

            return !data.some(
                lieu => lieu.repetition === true
            );
        }
    }

];


export const LieuxConfig = createEntityConfig({

    entity: "Lieux",

    title: "Gestion des lieux",

    table: "lieux",


    Repository: LieuxRepository,
    Service: LieuxService,
    Validator: LieuxValidator,
    Mapper: LieuxMapper,
    Controller: LieuxController,


    columns,
    actions,


    /*
     * Impossible de supprimer
     * le lieu des répétitions.
     */
    canDelete: (row) => {
        return row.repetition !== true;
    },


    /*
     * Le lieu de répétition reste
     * toujours en première position.
     */
    rowPriority: (row) => {
        return row.repetition === true
            ? 100
            : 0;
    }

});