import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { LieuxConfig } from "../../../../config/entities/Lieux.config";


export default function LieuxPage() {

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
            config={LieuxConfig}
        />
    );

}
