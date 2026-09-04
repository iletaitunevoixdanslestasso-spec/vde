import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { SaisonChanteurController } from "../../../../controllers/SaisonChanteurController";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { saisonChanteurConfig } from "../../../../config/entities/saisonChanteur.config";
import { useSaison } from "../../../../components/contexts/SaisonContext";


export default function SaisonChanteursPage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { saisonSelectionne } = useSaison();
    console.log("saisonSelectionne", saisonSelectionne)
    // const { saison_nom } = useParams();

    if (!saisonSelectionne) {
        navigate(`/admin`)
        return
    }
    return (
        <CRUDPage
            config={saisonChanteurConfig}
            context={{
                title: `${saisonSelectionne.active ? "⭐" : "📅"} ${saisonChanteurConfig.title} : ${saisonSelectionne.nom}`,
                saisonId: saisonSelectionne.id
            }}
        />
    );
}