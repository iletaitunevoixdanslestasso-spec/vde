import { BaseRepository } from "./BaseRepository";

export class ChanteurRepository extends BaseRepository {
    constructor(table) {
        super(table);
    }

     async findAllAndSaison(saisonId, orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select(`
            id,
            nom,
            prenom,
            saison_chanteurs!left (
                saisons(nom),
                id,
                saison_id,
                deleted_at
            )
        `)
            .eq("saison_chanteurs.saison_id", saisonId)
            .order(orderBy, { ascending: true });
    }  
}