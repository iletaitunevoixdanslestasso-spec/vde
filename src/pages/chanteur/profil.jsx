import React from "react";
import { chanteurConfig } from "../../config/entities/chanteur.config";
import CRUDItemPage from "../../framework/crud/CRUDItemPage";
import { useChanteur } from "../../components/contexts/ChanteurContext";

const profilConfig = {
    ...chanteurConfig,
    title: "Profil",
    columns: [
        { field: "nom", header: "Nom", type: "text", required: true },
        { field: "prenom", header: "Prénom", type: "text", required: true },
        { field: "email", header: "Email", type: "text", required: true },
        { field: "telephone", header: "Téléphone", type: "text", required: true },
        {
            field: "groupe_id",
            header: "Groupe",
            type: "select",
            source: "availableGroupes",
            required: true,
            render: (v, row) => {
                return `${row.groupes?.nom || "doit choisir"}`;
            }
        },
        {
            field: "pupitre_id",
            header: "Pupitre par défaut",
            type: "select",
            source: "availablePupitres",
            required: true,
            render: (v, row) => {
                return `${row.pupitre?.nom || "doit choisir"}`;
            }
        },
        {

            field: "droit_image_template_url",
            header: "Modèle de droit à l'image",
            type: "text",
            editType: "readonly",
            render: (v, row) => {

                if (!row.droit_image_template_url) {
                    return "Modèle indisponible";
                }

                return React.createElement(
                    "a",
                    {
                        href: row.droit_image_template_url,
                        target: "_blank",
                        rel: "noopener noreferrer"
                    },
                    "Télécharger le modèle"
                );
            }
        },
        {
            field: "droit_image",
            header: "Télécharger le droit à l'image",
            type: "fileUploader",
            signedUpload: true,
            bucket: "chanteur-documents",
            accept: ".pdf,application/pdf"
        },
        {
            field: "droit_image_url",
            header: "Mon droit à l'image",
            type: "text",
            editType: "readonly",
            // hideInForm: true,

            render: (v, row) => {

                if (!row.droit_image) {
                    return "Aucun document";
                }

                let link = React.createElement(
                    "a",
                    {
                        href: row.droit_image_url,
                        target: "_blank",
                        rel: "noopener noreferrer"
                    },
                    `📄 ${row.droit_image}`
                );
                let dai = ''
                switch (row.droit_image_workflow) {
                    case 3:
                        dai = '❌ Refusé'
                        break;
                    case 2:
                        dai = '✅ Accepté'
                        break;

                    default:
                        break;
                }

                let workflow = React.createElement(
                    "div",
                    null,
                    `${dai}`
                );

                return React.createElement(
                    "div",
                    null,
                    link,
                    workflow
                );
            }
        },

    ]
};

export default function ChanteurPage() {

    const storeCHanteur = JSON.parse(localStorage.getItem("chanteur"));
    const saison_id = JSON.parse(localStorage.getItem("chanteur")).saisonId;

    const {
        chanteur,
        loadingChanteur,
        setChanteur
    } = useChanteur();

    const token = localStorage.getItem("token");

    if (!chanteur)
        return (<div className="crud-loading">Chargement...</div >)

    return (
        <CRUDItemPage
            config={profilConfig}
            context={{ token, saisonId: saison_id }}
        />
    );
}