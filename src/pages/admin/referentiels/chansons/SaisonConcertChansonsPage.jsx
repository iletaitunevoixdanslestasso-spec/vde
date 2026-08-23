import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../../components/contexts/ConcertContext";
import { concertConfig } from "../../../../config/entities/concert.config";
import { SaisonConcertController } from "../../../../controllers/SaisonConcertController";


export default function SaisonConcertChansonsPage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { selectConcert } = useConcert();

    const config = {
        ...concertConfig,
        controller: new SaisonConcertController(concertConfig.service),
        title: `Chansons du concert-`
    }

    return (
        <CRUDPage
            config={config}
            context={{
                selectConcert:selectConcert
            }}

        />
    );

}
