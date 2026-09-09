import { supabase } from "../core/supabase/client";
import NotificationService from "./NotificationService";

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
            NotificationService.error(
                "Erreur envoi invitation :" + error
            );
            throw error;
        } else if (!data?.success) {
            NotificationService.error(
                "Erreur lors de l'envoi du mail"
            );
            throw new Error(
                data?.error || "Erreur lors de l'envoi du mail"
            );
        } else {
            NotificationService.success(
                "mail envoyé avec succès."
            );
        }

        return data;
    }

}