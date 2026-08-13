import { supabase } from "./client";
export async function getSaisonActive() {

  const { data, error } = await supabase
    .from("saisons")
    .select("*")
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}