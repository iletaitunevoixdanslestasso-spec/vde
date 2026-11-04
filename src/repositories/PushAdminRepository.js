import { supabase } from "../core/supabase/client";

/**
 * Seul point d'accès aux Edge Functions depuis l'interface d'administration.
 * La session Supabase Auth est transmise par le SDK.
 * Aucun secret privé n'est présent dans le navigateur.
 */
class PushAdminRepository {
  async executer(body) {
    const { data, error } = await supabase.functions.invoke("push-test", {
      body,
    });

    if (error) {
      // Sur un code HTTP 4xx/5xx, Supabase conserve la réponse ici.
      let message = error.message || "Impossible de contacter le service Push.";
      if (error.context && typeof error.context.json === "function") {
        try {
          const details = await error.context.json();
          if (typeof details?.error === "string") {
            message = details.error;
          }
        } catch {
          // Garde le message fourni par le SDK.
        }
      }
      throw new Error(message);
    }

    if (!data || typeof data !== "object") {
      throw new Error("Réponse invalide du service Push.");
    }

    return data;
  }
}

export const pushAdminRepository = new PushAdminRepository();
