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


    useEffect(() => {
        if (!saisonSelectionne || !concertSelectionne) {
            navigate("/admin");
            return
        }
    }, [saisonSelectionne, concertSelectionne, navigate]);

    // IMPORTANT : empêche le rendu avant la redirection
    if (!saisonSelectionne || !concertSelectionne) {
        return null;
    }

    return (
        <CRUDPage
            config={{
                ...SaisonConcertChansonConfig,
                title: `Les chansons pour ${concertSelectionne.titre}`
            }}
            context={{
                saisonId: saisonSelectionne?.id,
                concertId: concertSelectionne?.id,
                saisonConcertId: concertSelectionne?.saison_rendezvous[0].id,
            }}

        />
    );

}
