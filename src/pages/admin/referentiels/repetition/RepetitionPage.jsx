import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { repetitionConfig } from "../../../../config/entities/repetition.config";
import { useSaison } from "../../../../components/contexts/SaisonContext";


export default function RepetitionPage() {
    const { saisonSelectionne } = useSaison();



    return (
        <CRUDPage
            config={repetitionConfig}
            context={{saisonId: saisonSelectionne.id}}
        />
    );

}
