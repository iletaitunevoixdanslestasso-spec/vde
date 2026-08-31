/**
 * 
// Objectif du repository :

// ne contenir que l'accès Supabase
// ne pas contenir de logique métier
// préparer les besoins du service

// Nous aurons besoin de 3 opérations :

// récupérer les chanteurs d'une saison
// récupérer les associations existantes
// ajouter / supprimer une association
*/
import { BaseRepository } from "./BaseRepository";

export class ChanteurSaisonRepository extends BaseRepository {

    constructor() {
        super("saison_chanteurs");
    }


    /**
     * Liste les chanteurs associés à une saison
     */
    async findBySaison(saisonId) {

        return this.supabase
            .from(this.table)
            .select(`
                id,
                saison_id,
                chanteur_id,
                chanteurs (
                    id,
                    nom,
                    prenom,
                    email,
                    telephone,
                    droit_image,
                    droit_image_workflow,
                    relances_envois (
                        id,
                        chanteur_id,
                        type_relance_id,
                        contexte_id,
                        contexte_type,
                        date_envoi,
                        statut,
                        erreur,
                        template,
                        resultat_envoi,
                        message_id
                    )
                ),
                groupe_id,
                groupes (
                id,
                nom
                ),
                acces(
                token
                )
            `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null)
            .is("chanteurs.deleted_at", null)
        ;
    }


    /**
     * Vérifie si un chanteur est déjà associé
     */
    async exists(saisonId, chanteurId) {
        console.log(saisonId, chanteurId)
        return this.supabase
            .from(this.table)
            .select("id")
            .eq("saison_id", saisonId)
            .eq("chanteur_id", chanteurId)
            .is("deleted_at", null)
            .maybeSingle();
    }


    /**
     * Supprime l'association
     */
    async remove(id) {

        return this.supabase
            .from(this.table)
            .update({
                deleted_at: new Date().toISOString()
            })
            .eq("id", id);
    }
}