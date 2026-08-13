import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { saisonchanteurpupitreConfig } from "../../../../config/entities/saisonchanteurpupitre.config";


export default function SaisonchanteurpupitrePage() {

    const [session, setSession] = useState(null);


    useEffect(() => {

        const fetchSession = async () => {

            const { data: { session } } =
                await supabase.auth.getSession();

            console.log(session);

            setSession(session);

        };


        fetchSession();

    }, []);



    return (
        <CRUDPage
            config={saisonchanteurpupitreConfig}
        />
    );

}
