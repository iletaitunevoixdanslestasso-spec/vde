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
            .is("deleted_at", null)
            .order(orderBy, { ascending: true });
    }  


    async delete(id) {
        return await this.supabase
            .rpc("soft_delete_chanson", {
                p_id: id
            });

        
    }    
    async findAllNotDelete(orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select(`
                id,
                deleted_at,
                paroles,
                referentiel_documents(
                id,
                titre,
                path,
                document_type_id
                ),
                titre

                `)
            .is("deleted_at", null)
            .order(orderBy, { ascending: true });
    }    
}
