import { createEntityConfig } from "./createEntityConfig";


import { ChanteurRepository } from "../../repositories/ChanteurRepository";
import { ChanteurService } from "../../services/ChanteurService";
import { ChanteurValidator } from "../../validators/ChanteurValidator";
import { ChanteurMapper } from "../../mappers/ChanteurMapper";
import { ChanteurController } from "../../controllers/ChanteurController";
import React from "react";
import ChanteurPhoto from "../../components/ChanteurPhoto";


const entity = "chanteur";
const title = "les Adhérents";
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
        hideInForm: true,
        mapped: false,

        render: (v, row) => {

            if (!row.droit_image || v === 0) {
                return {
                    title: "Non fourni",
                    cssClass: "dai-status icon-none"
                };
            }

            if (v === 1) {
                return {
                    title: "À valider",
                    cssClass: "dai-status icon-pending"
                };
            }

            if (v === 2) {
                return {
                    title: "Validé",
                    cssClass: "dai-status icon-valider"
                };
            }

            if (v === 3) {
                return {
                    title: "Refusé",
                    cssClass: "dai-status icon-refuser"
                };
            }

            return {
                value: "Inconnu",
                cssClass: "dai-status icon-unknown"
            };
        }
    },
    {
        field: "droit_image_url",
        header: "Document DAI",
        type: "text",
        hideInForm: true,
        mapped: false,
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
    {
        field: "photo",
        header: "Photo",
        type: "text",
        hideInForm: true,
        mapped: false,
        render: (v, row) => React.createElement(
            ChanteurPhoto,
            {
                mode: "admin",
                path: row.photo,
                alt: `${row.prenom ?? ""} ${row.nom ?? ""}`.trim(),
                width: 56,
                height: 56
            }
        )
    },
    {
        field: "photo_drive_url",
        header: "Photo Google Drive",
        type: "text",
        hideInTable: true,
    },
];
const actions = [
    {
        label: "Valider D.A.I.",
        action: "validateDroitImage",
        cssClass: "icon-valider",
        condition: (row) =>
            row.droit_image != null && row.droit_image_workflow !== 2
    },
    {
        label: "Refuser DAI",
        action: "rejectDroitImage",
        cssClass: "icon-refuser",
        condition: (row) =>
            row.droit_image != null &&
            row.droit_image_workflow !== 3
    },

];

export const chanteurConfig = createEntityConfig({
    entity,
    title,
    table,
    icon: 'groupe',
    Repository: ChanteurRepository,
    Service: ChanteurService,
    Validator: ChanteurValidator,
    Mapper: ChanteurMapper,
    Controller: ChanteurController,
    columns,
    actions,
    defaultOrderBy: "nom",

});
