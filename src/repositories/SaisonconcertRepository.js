import { BaseRepository } from "./BaseRepository";

export class SaisonconcertRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    async findChansonsByConcert(saisonRendezvousId) {

        const { data, error } = await this.supabase
            .from("saison_concert_chansons")
            .select(`
                id,
                ordre,
                saison_chanson_id,
                saison_chansons!inner (
                    id,
                    chansons!inner (
                        id,
                        titre
                    )
                )
            `)
            .eq("saison_rendezvous_id", saisonRendezvousId)
            .is("deleted_at", null)
            .order("ordre", {
                ascending: true,
                nullsFirst: false
            });

        return { data, error };
    }
}