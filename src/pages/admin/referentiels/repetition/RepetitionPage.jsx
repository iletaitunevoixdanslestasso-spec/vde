import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { repetitionConfig } from "../../../../config/entities/repetition.config";
import { useSaison } from "../../../../components/contexts/SaisonContext";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../../components/contexts/ConcertContext";
import RepetitionExportService from "../../../../services/RepetitionExportService";


export default function RepetitionPage() {
    const { saisonActive, saisonSelectionne, updateSaisonSelectionneObjet } = useSaison();
    const navigate = useNavigate();
    const { selectConcert } = useConcert();

    useEffect(() => {
        if (!saisonSelectionne) {
            navigate("/admin");
        }
    }, [saisonSelectionne, navigate]);


    if (!saisonSelectionne)
        return



    const handleExportExcel = async () => {

        await RepetitionExportService.exportParticipations({
            saisonId: saisonSelectionne.id,
            saisonNom: saisonSelectionne.nom
        });

    };
    const context = {
        saisonId: saisonSelectionne.id,
        saisonNom: saisonSelectionne.nom,
        selectObjet: updateSaisonSelectionneObjet,
    }
    if(saisonActive.id == saisonSelectionne.id) {
        context['exportExcel']= handleExportExcel        
    }
return (
    <CRUDPage
        config={repetitionConfig}
        context={context}
    />
);

}
