import { BaseRepository } from "./BaseRepository";
import { supabase } from "../core/supabase/client";


export class PupitreRepository extends BaseRepository {

    constructor(table) {
        super( table);
    }

     async findAllAndChanson(chansonId, orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select(`
            id,
            nom,
            chanson_pupitres!left (
                chansons(titre),
                id,
                chanson_id,
                deleted_at
            )
        `)
            .eq("chanson_pupitres.chanson_id", chansonId)
            .order(orderBy, { ascending: true });
    }      

}