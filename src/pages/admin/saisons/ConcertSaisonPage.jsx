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
    const saisonConcertConfig = {
        ...concertConfig,
        controller: new SaisonConcertController(concertConfig.service),
        title: `Concerts de la saison`

    }



    return (
        <CRUDPage
            config={saisonConcertConfig}
            context={{
                title: `${saisonConcertConfig.title} : ${saisonSelectionne.nom} ${saisonSelectionne.active ? "⭐" : "📅"}`,
                saisonId: saisonSelectionne.id,
                selectConcert:selectConcert
            }}
        />
    );

}
