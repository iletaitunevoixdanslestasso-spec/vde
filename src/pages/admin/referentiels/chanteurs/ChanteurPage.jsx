import { useEffect, useState } from "react";
import { chanteurConfig } from "../../../../config/entities/chanteur.config";
import { supabase } from "../../../../core/supabase/client";
import CRUDPage from "../../../../framework/crud/CRUDPage";
import ImportChanteursExcel from "../../../../components/ImportChanteursExcel";
import { useSaison } from "../../../../components/contexts/SaisonContext";
import { useNavigate } from "react-router-dom";


export default function ChanteurPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const { saisonSelectionne, saisonActive } = useSaison();
  useEffect(() => { 
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log(session);
      setSession(session);
    };

    fetchSession();
  }, []);

    if(!saisonSelectionne ){
        navigate(`/admin`)
        return
    }

  console.log("saisonActive.id", saisonActive.id)  
  console.log("saisonSelectionne.id", saisonSelectionne.id)  


  return(
  <div>
    <div>

      <CRUDPage
        config={chanteurConfig} />;
    </div>
    <div><ImportChanteursExcel
      saisonId={saisonActive.id}
    />  </div>
  </div>)
}