import { createEntityConfig } from "./createEntityConfig";
import { ChanteursSaisonController } from "../../controllers/ChanteursSaisonController";
import { ChanteurSaisonMapper } from "../../mappers/ChanteurSaisonMapper";
import { ChanteurSaisonRepository } from "../../repositories/ChanteurSaisonRepository";
import { ChanteurSaisonService } from "../../services/ChanteurSaisonService";



const columns = [
    {
        field: "chanteur_id",
        header: "Chanteurs",
        type: "select",
        source: "availableChanteurs",
        required: true,
        render: (v, row) => {
            return `${row.chanteurs.nom} ${row.chanteurs.prenom}`;
        },
        editType: "readonly",


    },
    {
        field: "groupe_id",
        header: "Groupes",
        type: "select",
        source: "availableGroupes",
        required: true,
        render: (v, row) => {

            return `${row.groupes?.nom || "doit choisir"}`;
        }

    },
    {
        field: "mail",
        header: "E-mail",
        type: "text",
        hideInForm: true,
        // source: "availableChanteurs",
        render: (v, row) => {
            return `${row.chanteurs.email}`
        }

    },
    {
        field: "lien",
        header: "lien d'accès",
        type: "text",
        hideInForm: true,
        // source: "availableChanteurs",
        render: (v, row) => {

            const token = row.acces.length ? row.acces[0].token : ''
            return `${token}`
        }

    },
    {
        field: "droit_image_workflow",
        header: "Droit à l'image",
        type: "text",
        editType: "readonly",

        render: (v, row) => {
            console.log("v",v)
            v= row.chanteurs.droit_image_workflow
            if (!row.chanteurs.droit_image) {
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


];
const actions = [
    { label: "✏️ Modifier", action: "edit" },
    {
        label: "🔗 Générer lien",
        icon: "🔗",
        action: "generateAccessLink"
    },
    {
        label: "📋 Copier",
        icon: "📋",
        action: "copyAccessLink"
    },
    {
        label: "📩 Envoyer",
        icon: "📩",
        action: "sendAccessLink"
    },
    { label: "🗑 Supprimer", action: "delete" }
]

export const ChanteursSaisonConfig = createEntityConfig({

    entity: "chanteurSaison",
    title: "🎤 Chanteurs de la saison",
    table: "chanteurSaisons",
    Repository: ChanteurSaisonRepository,
    Service: ChanteurSaisonService,
    Mapper: ChanteurSaisonMapper,
    Controller: ChanteursSaisonController,

    columns,



    // ⭐ hooks optionnels
    hooks: {
        beforeSave: (form) => {
            if (form.dateDebut > form.dateFin) {
                throw new Error("Dates invalides");
            }
            return form;
        }
    },

    // ⭐ actions custom (IMPORTANT)
    useBaseActions: false,
    actions,

});