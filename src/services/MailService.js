import { supabase } from "../core/supabase/client";

export class MailService {

    async sendInvitation(chanteur, url) {
        const email = chanteur.email
        const prenom = chanteur.prenom
        console.log("Envoi mail à :", email);
        console.log("Lien :", url);

        const { data, error } = await supabase.functions.invoke(
            "mail",
            {
                body: {
                    email,
                    url,
                    prenom
                }
            }
        );

        if (error) {
            console.error("Erreur envoi invitation :", error);
            throw error;
        }

        if (!data?.success) {
            throw new Error(
                data?.error || "Erreur lors de l'envoi du mail"
            );
        }

        return data;
    }

}