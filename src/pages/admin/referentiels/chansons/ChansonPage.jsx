import { useEffect, useState } from "react";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import { chansonConfig } from "../../../../config/entities/chanson.config";
import { useChanson } from "../../../../components/contexts/ChansonContext";


export default function ChansonPage() {
  const { selectChanson } = useChanson();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    fetchSession();
  }, []);

    return <CRUDPage 
    config={chansonConfig}
    context={{selectChanson}}
    />;
}