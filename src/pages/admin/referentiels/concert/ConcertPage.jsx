import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { concertConfig } from "../../../../config/entities/concert.config";


export default function ConcertPage() {

    const [session, setSession] = useState(null);


    useEffect(() => {

        const fetchSession = async () => {

            const { data: { session } } =
                await supabase.auth.getSession();

            setSession(session);

        };


        fetchSession();

    }, []);



    return (
        <CRUDPage
            config={concertConfig}
        />
    );

}
