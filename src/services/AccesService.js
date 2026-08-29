/**
 * logique métier
 * generateLink(chanteur)
 * sendLink(chanteur)
 * invalidate()
 * renew()
 */
import { AccesRepository } from "../repositories/AccesRepository";

export class AccesService {

    constructor() {
        this.repository = new AccesRepository();
    }

    async generateLink(saisonchanteur) {

        console.log("AccesService.generateLink", saisonchanteur);

        // 1. chercher accès actif lié à cette inscription saison
        const { data: existing } =
            await this.repository.findActiveBySaisonChanteur(
                saisonchanteur.id
            );

        const now = new Date();

        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 30);


        // 2. si existe ET pas expiré => on retourne le lien existant
        if (existing && new Date(existing.date_expiration) > now) {
            const url = `${window.location.origin}/chanteur/${existing.token}`;
            return {
                token: existing.token,
                url: `${url}`,
                expiration: existing.date_expiration,
                created: false
            };
        }


        const token = crypto.randomUUID();


        // 3. si existe mais expiré => on renouvelle
        if (existing) {

            await this.repository.update(existing.id, {
                token,
                date_creation: now.toISOString(),
                date_expiration: expiration.toISOString(),
                nb_connexions: 0,
                derniere_connexion: null,
                actif: true
            });

            return {
                token,
                url: `${import.meta.env.VITE_APP_BASE_URL}/chanteur/${token}`,
                expiration: expiration.toISOString(),
                created: false
            };
        }


        // 4. sinon création d'un nouvel accès
        await this.repository.insert({
            saison_chanteur_id: saisonchanteur.id,
            token,
            date_creation: now.toISOString(),
            date_expiration: expiration.toISOString(),
            nb_connexions: 0,
            actif: true
        });


        return {
            token,
            url: `${import.meta.env.VITE_APP_BASE_URL}/${token}`,
            expiration: expiration.toISOString(),
            created: true
        };
    }
}