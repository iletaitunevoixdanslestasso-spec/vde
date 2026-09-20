import { BaseRepository } from "./BaseRepository";


export class LieuxRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    async setPourRepetition(id) {

        return this.supabase
            .from(this.table)
            .update({
                repetition: true
            })
            .eq("id", id)
            .is("deleted_at", null)
            .select()
            .single();
    }    
}
