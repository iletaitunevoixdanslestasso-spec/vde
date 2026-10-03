import { useEffect, useState } from "react";
import { supabase } from "../core/supabase/client";

export default function Concerts() {
  const [concerts, setConcerts] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("concerts").select("*");
      setConcerts(data || []);
    }

    load();
  }, []);

  return (
    <div>
      <h2>🎤 Concerts LALA</h2>

      {concerts.map((c) => (
        <div key={c.id}>
          {c.titre} - {c.lieu}
        </div>
      ))}
    </div>
  );
}