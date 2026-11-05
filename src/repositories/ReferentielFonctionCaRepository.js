import { BaseRepository } from "./BaseRepository";

export class ReferentielFonctionCaRepository extends BaseRepository {
    constructor(table = "referentiel_fonction_ca") {
        super(table);
    }

    async findAll() {
        return this.supabase
            .from(this.table)
            .select("id, libelle")
            .order("libelle", { ascending: true });
    }

    async findAllNotDelete() {
        return this.findAll();
    }

    async insert(data) {
        return this.supabase
            .from(this.table)
            .insert(data)
            .select("id, libelle")
            .single();
    }

    async delete(id) {
        return this.supabase
            .from(this.table)
            .delete()
            .eq("id", id)
            .select("id")
            .single();
    }
}
