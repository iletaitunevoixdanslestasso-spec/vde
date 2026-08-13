import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";





import CRUDPage from "../../../framework/crud/CRUDPage";
import { useSaison } from "../../../components/contexts/SaisonContext";
import { saisonchansonConfig } from "../../../config/entities/saisonchanson.config";


export default function RepartitionChansonsSaisonPage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { saisonSelectionne } = useSaison();
    if(!saisonSelectionne){
        navigate(`/admin`)
        return
    }
    
    return (
        <CRUDPage
            config={saisonchansonConfig}
            context={{
                title: `${saisonchansonConfig.title} : ${saisonSelectionne.nom} ${saisonSelectionne.active ? "⭐" : "📅"}`,
                saisonId: saisonSelectionne.id
            }}
        />
    );
}