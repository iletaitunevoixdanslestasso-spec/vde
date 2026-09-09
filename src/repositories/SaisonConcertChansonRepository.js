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
    async findAllInSaisonConcert_old(saisonId, saisonConcertId, orderBy = "created_at") {
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
            // .is("saison_concert_chansons.id", null)
            .is("chansons.deleted_at", null)
            // .is("saison_concert_chansons.deleted_at", null)
            .is("deleted_at", null)
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
                saison_rendezvous_id,
                saison_chanson_id,
                deleted_at
            )
        `)
            .eq("saison_id", saisonId)
            .eq(
                "saison_concert_chansons.saison_rendezvous_id",
                saisonConcertId
            )
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
    async findBySaisonRendezvousAndSaisonChanson(
        saisonRendezvousId,
        saisonChansonId
    ) {
        const { data, error } = await this.supabase
            .from("saison_concert_chansons")
            .select("*")
            .eq("saison_rendezvous_id", saisonRendezvousId)
            .eq("saison_chanson_id", saisonChansonId)
            .maybeSingle();

        return { data, error };
    }

    async reactivate(id) {
        const { data, error } = await this.supabase
            .from("saison_concert_chansons")
            .update({
                deleted_at: null,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        return { data, error };
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
