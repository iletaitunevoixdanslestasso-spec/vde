import { BaseRepository } from "./BaseRepository";


export class RendezvouRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }
    async findTypeRepetition() {

        return this.supabase
            .from(this.table)
            .select(`
            *,
            rendezvous_type!inner(
                id,
                libelle,
                code
            )
        `)
            .eq("rendezvous_type.code", "repet")
            .is("deleted_at", null)
            .maybeSingle();
    }
}
