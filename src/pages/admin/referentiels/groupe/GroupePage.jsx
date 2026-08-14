import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { groupeConfig } from "../../../../config/entities/groupe.config";
import { useNavigate } from "react-router-dom";
import { useSaison } from "../../../../components/contexts/SaisonContext";


export default function GroupePage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { saisonSelectionne } = useSaison();
    if(!saisonSelectionne){
        navigate(`/admin`)
        return
    }
    
    return (
        <CRUDPage
            config={groupeConfig}
            context={{
                title: `${groupeConfig.title} : ${saisonSelectionne.nom} ${saisonSelectionne.active ? "⭐" : "📅"}`,
                saisonId: saisonSelectionne.id
            }}
        />
    );

}
