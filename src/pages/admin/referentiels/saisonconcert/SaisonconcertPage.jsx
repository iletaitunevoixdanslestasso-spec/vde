import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { saisonconcertConfig } from "../../../../config/entities/saisonconcert.config";
import { useSaison } from "../../../../components/contexts/SaisonContext";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../../components/contexts/ConcertContext";


export default function SaisonconcertPage() {

    const [session, setSession] = useState(null);
    const { saisonSelectionne, saisonActive } = useSaison();
    const { concertSelectionne } = useConcert();
    const navigate = useNavigate();
    console.log(saisonSelectionne)
    console.log(concertSelectionne)

    if(!saisonSelectionne || !concertSelectionne){
        navigate(`/admin`)
        return
    }

    return (
        <CRUDPage
            config={{...saisonconcertConfig, 
                title:`${saisonSelectionne.nom} : ${concertSelectionne.titre} : les Chansons` 
            }}
            context={{
                saisonSelectionne,
                saisonId:saisonSelectionne.id
            }}
        />
    );

}
