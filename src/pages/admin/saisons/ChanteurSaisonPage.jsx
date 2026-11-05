import { useEffect } from "react";
import { useNavigate } from "react-router-dom";





import CRUDPage from "../../../framework/crud/CRUDPage";
import { useSaison } from "../../../components/contexts/SaisonContext";
import { ChanteursSaisonConfig } from "../../../config/entities/chanteursSaison.config";


export default function ChanteurSaisonPage() {
    const navigate = useNavigate();
    const { saisonSelectionne } = useSaison();
  useEffect(() => {
        if (!saisonSelectionne) {
            navigate("/admin");
        }
    }, [saisonSelectionne, navigate]);

    if (!saisonSelectionne) {
        return null;
    }    
    return (
        <CRUDPage
            config={ChanteursSaisonConfig}
            context={{
                title: `${ChanteursSaisonConfig.title}`,
                saisonId: saisonSelectionne.id
            }}
        />
    );
}
