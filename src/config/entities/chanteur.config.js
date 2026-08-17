import { createEntityConfig } from "./createEntityConfig";


import { ChanteurRepository } from "../../repositories/ChanteurRepository";
import { ChanteurService } from "../../services/ChanteurService";
import { ChanteurValidator } from "../../validators/ChanteurValidator";
import { ChanteurMapper } from "../../mappers/ChanteurMapper";
import { ChanteurController } from "../../controllers/ChanteurController";
import React from "react";


const entity = "chanteurs";
const title = "🎤 les Chanteurs";
const table = "chanteurs";
const columns = [
    { field: "nom", header: "Nom", type: "text", required: true },
    { field: "prenom", header: "Prénom", type: "text", required: true },
    { field: "email", header: "Email", type: "text", required: true },
    { field: "telephone", header: "Téléphone", type: "text", required: true },
    {
        field: "droit_image_workflow",
        header: "Droit à l'image",
        type: "text",
        editType: "readonly",

        render: (v, row) => {

            if (!row.droit_image) {
                return "Non fourni";
            }

            if (v === 0) {
                return "Non fourni";
            }

            if (v === 1) {
                return "⏳ À valider";
            }

            if (v === 2) {
                return "✅ Validé";
            }

            if (v === 3) {
                return "❌ Refusé";
            }

            return "Inconnu";
        }
    },
    {
        field: "droit_image_url",
        header: "Document DAI",
        type: "text",
        hideInForm: true,

        render: (v, row) => {

            if (!v) {
                return "Aucun document";
            }

            return React.createElement(
                "a",
                {
                    href: v,
                    target: "_blank",
                    rel: "noopener noreferrer"
                },
                "📄 Voir le DAI"
            );
        }
    },
];
const actions = [
    {
        label: "✅ Valider DAI",
        action: "validateDroitImage",
        condition: (row) =>
                        row.droit_image != null &&
            row.droit_image_workflow !== 2
    },
    {
        label: "❌ Refuser DAI",
        action: "rejectDroitImage",
        condition: (row) =>
                        row.droit_image != null &&
            row.droit_image_workflow !== 3
    },
  
];

export const chanteurConfig = createEntityConfig({
    entity,
    title,
    table,
    Repository: ChanteurRepository,
    Service: ChanteurService,
    Validator: ChanteurValidator,
    Mapper: ChanteurMapper,
    Controller: ChanteurController,
    columns,
    actions,
    defaultOrderBy: "nom",

});
