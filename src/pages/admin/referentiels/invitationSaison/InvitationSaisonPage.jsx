import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { invitationSaisonConfig } from "../../../../config/entities/invitationSaison.config";
import { useSaison } from "../../../../components/contexts/SaisonContext";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../../components/contexts/ConcertContext";
import { concertConfig } from "../../../../config/entities/concert.config";
import { SaisonInvitationController } from "../../../../controllers/SaisonInvitationController";
import { invitationConfig } from "../../../../config/entities/invitation.config";

// const columns = [
//     {
//         field: "rendezvous_type",
//         header: "Type",
//         type: "select",
//         required:true,
//         source: "rendezvous_type",
//     },
//     ...concertConfig.columns.filter(
//         column => column.field !== "heure_debut"
//     ),
// ]

export default function InvitationSaisonPage() {
    const { saisonSelectionne } = useSaison()
    const navigate = useNavigate();
    const { selectConcert } = useConcert();

    const configLocal = {
        ...invitationConfig,
        // columns: columns,
        controller: new SaisonInvitationController(invitationConfig.service),
        title: `Invitations de la saison`

    }
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
