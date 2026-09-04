import { useEffect, useState } from "react";
import CRUDPage from "../../../framework/crud/CRUDPage";
import { concertConfig } from "../../../config/entities/concert.config";
import { useSaison } from "../../../components/contexts/SaisonContext";
import { SaisonConcertController } from "../../../controllers/SaisonConcertController";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../components/contexts/ConcertContext";


export default function ConcertSaisonPage() {
    const { saisonSelectionne } = useSaison()
    const navigate = useNavigate();
    const { selectConcert } = useConcert();
    const configLocal = {
        ...concertConfig,
        controller: new SaisonConcertController(concertConfig.service),
        title: `Concerts de la saison`

    }
    useEffect(() => {
    if (!saisonSelectionne) {
        navigate(`/admin`)
    }
    }, [saisonSelectionne, navigate]);    

    return (
        <CRUDPage
            config={configLocal}
            context={{
                title: `${configLocal.title} : ${saisonSelectionne.nom} ${saisonSelectionne.active ? "⭐" : "📅"}`,
                saisonId: saisonSelectionne.id,
                saisonNom: saisonSelectionne.nom,
                selectConcert: selectConcert
            }}
        />
    );

}
