import { BaseRepository } from "./BaseRepository";
import { supabase } from "../core/supabase/client";

export class SaisonChanteurPupitreRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    async findBySaisonAndChanson(saisonId, chansonId) {

        const { data, error } = await supabase
            .from(this.table)
            .select(`
                id,
                saison_id,
                chanteur_id,
                chanson_id,
                pupitre_id,
                principal
            `)
            .eq("saison_id", saisonId)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null);

        if (error) {
            throw error;
        }

        return data || [];
    }

}