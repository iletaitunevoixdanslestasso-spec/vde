import { BaseRepository } from "./BaseRepository";


export class ChansonpupitreRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    /**
     * Liste les chansons associés à une saison
     */
    async findBySaison(chansonId) {
        console.log("chansonId", chansonId)
        return this.supabase
            .from(this.table)
            .select(`
                id,
                ordre,
                pupitre_id,
                pupitres (
                    id,
                    nom
                ),
                chanson_id,
                chansons (
                    id,
                    titre
                ),
                audio_url
                
            `)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null)
            .order("ordre", {
                ascending: true
            })
            ;
    }


    /**
     * Vérifie si un chanson est déjà associé
     */
    async exists(pupitreId, chansonId) {

        return this.supabase
            .from(this.table)
            .select("id")
            .eq("pupitre_id", pupitreId)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null)
            .maybeSingle();
    }
    async findByChanson(chansonId) {
        return this.supabase
            .from(this.table)
            .select(`
                id,
                chanson_id,
                pupitre_id,
                ordre,
                pupitres (
                    id,
                    nom
                )
            `)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null)
            .order("ordre", {
                ascending: true
            });
    }

    async updateOrdre(id, ordre) {
        return this.supabase
            .from(this.table)
            .update({
                ordre
            })
            .eq("id", id);
    }

    async updateOrdres(rows) {

        const promises = rows.map((row, index) =>
            this.supabase
                .from(this.table)
                .update({
                    ordre: index + 1
                })
                .eq("id", row.id)
        );

        return Promise.all(promises);
    }

}



