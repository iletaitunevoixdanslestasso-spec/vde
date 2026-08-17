import { BaseRepository } from "./BaseRepository";


export class DocumentTypeRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }
    async findAllActive() {
        return this.supabase
            .from(this.table)
            .select("id, code, libelle")
            .is("deleted_at", null)
            .order("libelle", { ascending: true });
    }

    async findByCode(code) {
        return this.supabase
            .from(this.table)
            .select("*")
            .eq("code", code)
            .is("deleted_at", null)
            .order("libelle", { ascending: true })            
            .maybeSingle();
    }
}
