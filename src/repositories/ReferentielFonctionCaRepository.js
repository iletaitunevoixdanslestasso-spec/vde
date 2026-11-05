import { BaseRepository } from "./BaseRepository";

export class ReferentielFonctionCaRepository extends BaseRepository {
    constructor(table = "referentiel_fonction_ca") {
        super(table);
    }

    async findAll() {
        return this.supabase
            .from(this.table)
            .select("id, libelle, ordre")
            .order("ordre", { ascending: true })
            .order("libelle", { ascending: true });
    }

    async findAllNotDelete() {
        return this.findAll();
    }

    async insert(data) {
        return this.supabase
            .from(this.table)
            .insert(data)
            .select("id, libelle, ordre")
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
