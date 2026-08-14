import { useEffect, useState } from "react";
import { chanteurConfig } from "../../../../config/entities/chanteur.config";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import ImportChanteursExcel from "../../../../components/ImportChanteursExcel";
import { useSaison } from "../../../../components/contexts/SaisonContext";


export default function ChanteurPage() {

  const [session, setSession] = useState(null);
  const { saisonSelectionne } = useSaison();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log(session);
      setSession(session);
    };

    fetchSession();
  }, []);

  return(
  <div>
    <div>

      <CRUDPage
        config={chanteurConfig} />;
    </div>
    <div><ImportChanteursExcel
      saisonId={saisonSelectionne.id}
    />  </div>
  </div>)
}