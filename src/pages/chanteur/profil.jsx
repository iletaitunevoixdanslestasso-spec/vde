import { chanteurConfig } from "../../config/entities/chanteur.config";
import { ChanteurController } from "../../controllers/ChanteurController";
import CRUDItemPage from "../../framework/crud/CRUDItemPage";

const profilConfig = {
    ...chanteurConfig,
    Controller: ChanteurController,
    title:"Profil",
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
        }
    ]
};

export default function ChanteurPage() {
    
    const chanteur = JSON.parse(localStorage.getItem("chanteur"));
    const token = localStorage.getItem("token");


    return (
        <CRUDItemPage
            config={profilConfig}
            context={{ token, saisonId: chanteur?.saisonId }}
        />
    );
}