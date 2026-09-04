import { useNavigate } from "react-router-dom";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { useSaison } from "../../../../components/contexts/SaisonContext";
// import { saisonrepetitionchanteursConfig } from "../../../../config/entities/saisonrepetitionchanteurs.config";
import { formatDate } from "../../../../helper/helper";
import { useEffect } from "react";
import { saisonrepetitionchanteursConfig } from "../../../../config/entities/saisonrepetitionchanteur.config";



export default function SaisonRepetitionChanteursPage() {

    const navigate = useNavigate();

    const {
        saisonSelectionne,
        saisonSelectionneObjet
    } = useSaison();

    console.log("saisonSelectionneObjet",saisonSelectionneObjet)
    useEffect(() => {
        console.log("saisonSelectionneObjet",saisonSelectionneObjet)
        if (!saisonSelectionne || !saisonSelectionneObjet) {
            navigate(`/admin`);
        }
    }, [saisonSelectionne, navigate, saisonSelectionneObjet]);


    return (
        <CRUDPage
            config={{
                ...saisonrepetitionchanteursConfig,

                title:
                    `Les choristes de la répétition du ${formatDate(
                        saisonSelectionneObjet?.date
                    )}`
            }}

            context={{
                saisonId: saisonSelectionne?.id,
                repetitionId: saisonSelectionneObjet?.id,
                saisonSelectionneObjet
            }}
        />
    );
}