import { BaseRepository } from "./BaseRepository";


export class GroupeRepository extends BaseRepository {

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
            nom,
            description,
            created_at,
            updated_at
        `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null);
    }


}
