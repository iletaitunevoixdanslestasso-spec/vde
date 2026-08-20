import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";





import CRUDPage from "../../../framework/crud/CRUDPage";
import { useSaison } from "../../../components/contexts/SaisonContext";
import { saisonchansonConfig } from "../../../config/entities/saisonchanson.config";
import { useChanson } from "../../../components/contexts/ChansonContext";


export default function ChansonsSaisonPage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { saisonSelectionne } = useSaison();
    const { selectChanson } = useChanson();
    
    if(!saisonSelectionne){
        navigate(`/admin`)
        return
    }
    
    return (
        <CRUDPage
            config={saisonchansonConfig}
            context={{
                title: `${saisonchansonConfig.title} : ${saisonSelectionne.nom} ${saisonSelectionne.active ? "⭐" : "📅"}`,
                saisonId: saisonSelectionne.id,
                selectChanson
            }}
        />
    );
}