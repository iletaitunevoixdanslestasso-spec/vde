import { BaseRepository } from "./BaseRepository";


export class ChansonRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

     async findAllAndSaison(saisonId, orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select(`
            id,
            titre,
            saison_chansons!left (
                saisons(nom),
                id,
                saison_id,
                deleted_at
            )
        `)
            .eq("saison_chansons.saison_id", saisonId)
            .order(orderBy, { ascending: true });
    }  
}
