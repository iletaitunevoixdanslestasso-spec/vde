import { chanteurConfig } from "../../config/entities/chanteur.config";
import { ChanteurController } from "../../controllers/ChanteurController";
import CRUDItemPage from "../../framework/crud/CRUDItemPage";

const profilConfig = {
    ...chanteurConfig,
    Controller: ChanteurController,
    columns: [
        ...chanteurConfig.columns,
        {
            field: "groupe_id",
            header: "Groupe",
            type: "select",
            source: "availableGroupes",
            required: true,
            render: (v, row) => {
                return `${row.groupes?.nom || "doit choisir"}`;
            }
        }
    ]
};

export default function ChanteurPage() {

    const token = localStorage.getItem("token");
    const chanteur = JSON.parse(localStorage.getItem("chanteur"));

    return (
        <CRUDItemPage
            config={profilConfig}
            context={{ token, saisonId: chanteur?.saisonId }}
        />
    );
}