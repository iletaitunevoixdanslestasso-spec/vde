import { supabase } from "../core/supabase/client";

/** Appels de fonctions avec la session existante et lecture commune des erreurs. */
export async function invokeEdgeFunction(name, body, fallback = "Impossible de contacter le service.") {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
        let message = error.message || fallback;
        if (typeof error.context?.json === "function") {
            try {
                const details = await error.context.json();
                if (typeof details?.error === "string") message = details.error;
            } catch { /* Conserver le message du SDK pour les réponses non JSON. */ }
        }
        throw new Error(message);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Réponse invalide du service.");
    return data;
}
