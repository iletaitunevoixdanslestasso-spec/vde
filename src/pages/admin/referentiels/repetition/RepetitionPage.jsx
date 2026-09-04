import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { repetitionConfig } from "../../../../config/entities/repetition.config";
import { useSaison } from "../../../../components/contexts/SaisonContext";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../../components/contexts/ConcertContext";


export default function RepetitionPage() {
    const { saisonSelectionne,  updateSaisonSelectionneObjet } = useSaison();
    const navigate = useNavigate();
    const { selectConcert } = useConcert(); 
    
    useEffect(() => {
        if (!saisonSelectionne) {
            navigate("/admin");
        }
    }, [saisonSelectionne, navigate]);




    return (
        <CRUDPage
            config={repetitionConfig}
            context={{
                saisonId: saisonSelectionne.id,
                saisonNom: saisonSelectionne.nom,
                selectObjet :updateSaisonSelectionneObjet,
            }}
        />
    );

}
