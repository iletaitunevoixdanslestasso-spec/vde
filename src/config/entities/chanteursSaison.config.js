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
        sortValue: (row) => {
            return `${row.chanteurs?.nom ?? ""} ${row.chanteurs?.prenom ?? ""}`;
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
        },
        sortValue: (row) => {
            return `${row.groupes?.nom || "doit choisir"}`;
        },


    },
    {
        field: "mail",
        header: "E-mail",
        type: "text",
        hideInForm: true,
        // source: "availableChanteurs",
        render: (v, row) => {
            return `${row.chanteurs.email}`
        },
        sortValue: (row) => {
            return row.chanteurs?.email ?? "";
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
        field: "mail_envoyes",
        header: "relances",
        type: "text",
        editType: "readonly",
        hideInForm: true,

        render: (v, row) => {
            v = row.chanteurs.relances_envois.sort((a,b)=>  b.id- a.id )
            if (v[0].erreur ) {
                return {
                    title: `${v[0].erreur}`,
                    cssClass: "dai-status icon-etaterreur"
                };
            }

            return {
                title: "Validé",
                cssClass: "dai-status icon-valider"
            };
        }
    },
    {
        field: "droit_image_workflow",
        header: "D.à I.",
        type: "text",
        editType: "readonly",
        hideInForm: true,

        render: (v, row) => {

            v = row.chanteurs.droit_image_workflow
            if (!row.chanteurs.droit_image || v === 0) {
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
                title: "Inconnu",
                cssClass: "dai-status icon-unknown"
            };
        }
    },


];
const actions = [
        {
        title: "Modifier",
        action: "edit",
        cssClass: "icon-edit"
    },

    {
        label: "Générer lien",
        icon: "🔗",
        action: "generateAccessLink"
    },
    {
        label: "Copier",
        icon: "📋",
        action: "copyAccessLink"
    },
    {
        label: "Envoyer",
        icon: "📩",
        action: "sendAccessLink"
    },
    {
        title: "Supprimer",
        action: "delete",
        cssClass: "icon-delete"
    }
]

export const ChanteursSaisonConfig = createEntityConfig({

    entity: "chanteurSaison",
    title: "🎤 Choristes de la saison",
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