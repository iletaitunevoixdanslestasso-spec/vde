import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";





import CRUDPage from "../../../framework/crud/CRUDPage";
import { useSaison } from "../../../components/contexts/SaisonContext";
import { ChanteursSaisonConfig } from "../../../config/entities/chanteursSaison.config";


export default function ChanteurSaisonPage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { saisonSelectionne } = useSaison();
    if(!saisonSelectionne){
        navigate(`/admin`)
        return
    }
    
    return (
        <CRUDPage
            config={ChanteursSaisonConfig}
            context={{
                title: `${ChanteursSaisonConfig.title} : ${saisonSelectionne.nom} ${saisonSelectionne.active ? "⭐" : "📅"}`,
                saisonId: saisonSelectionne.id
            }}
        />
    );
}