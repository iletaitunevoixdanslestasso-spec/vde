import { BaseRepository } from "./BaseRepository";


export class ReferentielDocumentRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }
    async findByDocumentTypeId(documentTypeId) {
        return this.findOneBy({
            document_type_id: documentTypeId
        });
    }
    async findAllNotDelete(orderBy = "titre") {
        return this.supabase
            .from(this.table)
            .select(`
            id,
            titre,
            path,
            document_type_id,
            document_types!left (
                id,
                code,
                libelle
            )
        `)
            .is("document_types.deleted_at", null)
            .is("deleted_at", null)
            .order(orderBy, { ascending: true });
    }
    async findByCode(code = "paroles") {
        return this.supabase
            .from(this.table)
            .select(`
            id,
            titre,
            document_type_id,
            document_types!left (
                id,
                code,
                libelle
            )
        `)
            .eq("document_types.code", code)
            .is("document_types.deleted_at", null)
            .is("deleted_at", null)
            .order("titre", { ascending: true });
    }


}
