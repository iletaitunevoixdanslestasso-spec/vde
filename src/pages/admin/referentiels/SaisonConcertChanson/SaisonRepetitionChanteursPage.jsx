import { useNavigate } from "react-router-dom";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { useSaison } from "../../../../components/contexts/SaisonContext";
// import { saisonrepetitionchanteursConfig } from "../../../../config/entities/saisonrepetitionchanteurs.config";
import { formatDate, formatDateFileName } from "../../../../helper/helper";
import { useEffect } from "react";
import { saisonrepetitionchanteursConfig } from "../../../../config/entities/saisonrepetitionchanteur.config";



export default function SaisonRepetitionChanteursPage() {

    const navigate = useNavigate();

    const {
        saisonSelectionne,
        saisonSelectionneObjet
    } = useSaison();

    useEffect(() => {
        if (!saisonSelectionne || !saisonSelectionneObjet) {
            navigate(`/admin`);
        }
    }, [saisonSelectionne, navigate, saisonSelectionneObjet]);

let fileName =formatDateFileName(saisonSelectionneObjet?.date)
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
                exportExcel:{fileName},
                nouveau:true,
                saisonId: saisonSelectionne?.id,
                repetitionId: saisonSelectionneObjet?.id,
                saisonSelectionneObjet
            }}
        />
    );
}