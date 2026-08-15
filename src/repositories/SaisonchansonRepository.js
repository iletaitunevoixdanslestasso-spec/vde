import { BaseRepository } from "./BaseRepository";


export class SaisonchansonRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }


    /**
     * Liste les chansons associés à une saison
     */
    async findBySaison(saisonId) {
        
        return this.supabase
            .from(this.table)
            .select(`
                id,
                saison_id,
                chanson_id,
                chansons (
                    id,
                    titre
                )
            `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null)
            .is("chansons.deleted_at", null)
            ;
    }


    /**
     * Vérifie si un chanson est déjà associé
     */
    async exists(saisonId, chansonId) {

        return this.supabase
            .from(this.table)
            .select("id")
            .eq("saison_id", saisonId)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null)
            .maybeSingle();
    }

}
