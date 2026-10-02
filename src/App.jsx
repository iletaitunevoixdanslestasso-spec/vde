import { useEffect } from "react";
import { supabase } from "./supabase";

function App() {

  useEffect(() => {

    async function test() {

      const { data, error } = await supabase
        .from("questions")
        .select("*");


    }

    test();

  }, []);

  return <>Bonjour la chorale</>;
}

export default App;