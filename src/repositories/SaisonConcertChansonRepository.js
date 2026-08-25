import { BaseRepository } from "./BaseRepository";


export class SaisonConcertChansonRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }
    async findAllNotDelete(saisonConcertId, orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select(`
                *,
                saison_chansons!left(
                    *,
                    chansons(*
                    )
                )
            `)
            .is("deleted_at", null)
            .eq("saison_rendezvous_id", saisonConcertId)
            .is("saison_chansons.deleted_at", null)
            .is("saison_chansons.chansons.deleted_at", null)
            .order(orderBy, { ascending: true });
    }
    async findAllInSaisonConcert(saisonId, saisonConcertId, orderBy = "created_at") {
        return this.supabase
            .from("saison_chansons")
            .select(`
                id,
                saison_id,
                chansons (
                    id,
                    titre
                ),
                saison_concert_chansons!left (
                    id,
                    saison_rendezvous_id
                )
            `)
            .eq("saison_id", saisonId)
            .eq(
                "saison_concert_chansons.saison_rendezvous_id",
                saisonConcertId
            )
            .is("saison_concert_chansons.id", null)
            .is("saison_concert_chansons.deleted_at", null)
            .is("deleted_at", null)
            .order(orderBy, { ascending: true });
    }
    /**
     * Vérifie si un chanteur est déjà associé
     */
    async exists(saisonChansonId, saisonConcertId) {

        return this.supabase
            .from(this.table)
            .select("id")
            .eq("saison_chanson_id", saisonChansonId)
            .eq("saison_rendezvous_id", saisonConcertId)
            .is("deleted_at", null)
            .maybeSingle();
    }

}
