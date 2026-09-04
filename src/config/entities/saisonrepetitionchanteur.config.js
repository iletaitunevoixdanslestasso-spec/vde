import React from "react";
import RepetitionParticipation from "../../components/RepetitionParticipation";
import { SaisonrepetitionchanteurController } from "../../controllers/SaisonrepetitionchanteurController";
import { SaisonrepetitionchanteurMapper } from "../../mappers/SaisonrepetitionchanteurMapper";
import SaisonRepetitionChanteursPage from "../../pages/admin/referentiels/SaisonConcertChanson/SaisonRepetitionChanteursPage";
import { SaisonRepetitionChanteurRepository } from "../../repositories/SaisonrepetitionchanteurRepository";

import { SaisonrepetitionchanteurService } from "../../services/SaisonrepetitionchanteurService";
import { SaisonrepetitionchanteurValidator } from "../../validators/SaisonrepetitionchanteurValidator";
import { createEntityConfig } from "./createEntityConfig";
import RepetitionParticipationControllerAdmin from "../../components/repetition_participation/RepetitionParticipationControllerAdmin";



const columns = [

    {
        field: "chanteur",
        header: "Choristes",
        type: "text",

        render: (v, row) => {
            return [
                row.chanteurs?.nom,
                row.chanteurs?.prenom,
            ]
                .filter(Boolean)
                .join(" ");

        },

        sortValue: (row) => {

            return [
                row.chanteurs?.nom,
                row.chanteurs?.prenom,
            ]
                .filter(Boolean)
                .join(" ");

        }
    },


    {
        field: "participe",
        header: "Participation",
        type: "select",

        source: "participations",
        render: (v, row, context) => {

            return React.createElement(
                RepetitionParticipationControllerAdmin,
                {
                    repetition: context.saisonSelectionneObjet,
                    row: row
                }
            );
        }
    }

];


const actions = [];


export const saisonrepetitionchanteursConfig =
    createEntityConfig({

        entity: "saisonrepetitionchanteurs",

        title: "Les choristes",

        table: "repetition_chanteurs",

        Repository:
            SaisonRepetitionChanteurRepository,

        Service:
            SaisonrepetitionchanteurService,

        Validator:
            SaisonrepetitionchanteurValidator,

        Mapper:
            SaisonrepetitionchanteurMapper,

        Controller:
            SaisonrepetitionchanteurController,

        columns,
        actions

    });