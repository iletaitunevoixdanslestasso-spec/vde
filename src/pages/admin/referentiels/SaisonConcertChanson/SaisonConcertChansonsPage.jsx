import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../../components/contexts/ConcertContext";
import { SaisonConcertChansonConfig } from "../../../../config/entities/SaisonConcertChanson.config";
import { SaisonConcertController } from "../../../../controllers/SaisonConcertController";
import { useSaison } from "../../../../components/contexts/SaisonContext";
import { saisonchansonConfig } from "../../../../config/entities/saisonchanson.config";


export default function SaisonConcertChansonsPage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { selectConcert, concertSelectionne } = useConcert();
    const { selectSaison, saisonSelectionne } = useSaison();
    console.log(concertSelectionne)
    console.log(saisonSelectionne)

    if(!saisonSelectionne){
        navigate(`/admin`)
        return
    }
    if(!concertSelectionne){
        navigate(`/admin/saison/${saisonSelectionne.nom}/concerts`)
        return
    }

    return (
        <CRUDPage
            config={SaisonConcertChansonConfig}
            context={{
                saisonId:saisonSelectionne.id,
                concertId:concertSelectionne.id,
                saisonConcertId:concertSelectionne.saison_rendezvous[0].id,
            }}

        />
    );

}
