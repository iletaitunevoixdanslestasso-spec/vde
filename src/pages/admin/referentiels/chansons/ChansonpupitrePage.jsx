import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { chansonpupitreConfig } from "../../../../config/entities/chansonpupitre.config";
import { useChanson } from "../../../../components/contexts/ChansonContext";
import { useNavigate } from "react-router-dom";


export default function ChansonpupitrePage() {
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const { chansonSelectionnee } = useChanson();
    console.log("chansonSelectionnee", chansonSelectionnee)
    if(!chansonSelectionnee){
        navigate(`/admin`)
        return
    }
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
            config={chansonpupitreConfig}
            context={{
                title: `🎵 ${chansonSelectionnee.titre} : ${chansonpupitreConfig.title}`,
                chansonId: chansonSelectionnee.id
            }}

        />
    );

}
