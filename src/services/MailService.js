export class MailService {

    async sendInvitation(email, url) {

        console.log("Envoi mail à :", email);
        console.log("Lien :", url);

        return {
            success: true
        };
    }

}