
import { BaseController } from "../../controllers/BaseController";
const controller = new BaseController();
export const baseConfig = {
    entity: "à définir",
    title: "de base",
    table: "à dérfinir",
    controller: controller,

    columns: [
        {
            field: "active",
            header: "Active",
            type: "boolean",
            hideInForm: true,
            render: (v) => (v ? "⭐" : "")
        }
    ],

actions: [
    {
        title: "Modifier",
        action: "edit",
        cssClass: "icon-edit"
    },
    {
        title: "Supprimer",
        action: "delete",
        cssClass: "icon-delete"
    }
],
    features: {
        search: true,
        pagination: true
    }
};