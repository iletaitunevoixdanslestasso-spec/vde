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

export class SaisonChanteurRepository extends BaseRepository {

    constructor() {
        super("saison_chanteurs");
    }



    async insert(data) {
        console.log(data)
        // const result = await this.supabase
        //     .from(this.table)
        //     .insert(data)
        //     .select("*")
        //     .single();


        result = {
            "code": "23505",
            "details": "EN DUR ",
            "hint": null,
            "message": "duplicate key value violates unique constraint \"saison_chanteurs_saison_id_chanteur_id_key\""
        };
        console.log(result)
        return result;
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
                chanteurs!left (
                    id,
                    nom,
                    prenom,
                    email,
                    telephone
                )
                
            `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null)
            .is("chanteurs.deleted_at", null);
    }
       async findBySaison_convention(saisonId) {
        const { data, error } = await this.supabase
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
                    telephone
                )
            `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null);
    

        if (error) {
            throw error;
        }

        return data || [];

        // return this.supabase
        //     .from(this.table)
        //     .select(`
        //         id,
        //         saison_id,
        //         chanteur_id,
        //         chanteurs (
        //             id,
        //             nom,
        //             prenom,
        //             email,
        //             telephone
        //         )
        //     `)
        //     .eq("saison_id", saisonId)
        //     .is("deleted_at", null);
    }
 


    /**
     * Vérifie si un chanteur est déjà associé
     */
    async exists(saisonId, chanteurId) {

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