import { BaseRepository } from "./BaseRepository";


export class SaisonChansonLeadRepository
    extends BaseRepository {

    constructor() {
        super("saison_chanson_leads");
    }


    async findByToken(token) {

        const { data, error } =
            await this.supabase.rpc(
                "get_mes_chanson_leads",
                {
                    p_token: token
                }
            );


        if (error) {
            throw error;
        }


        return data || [];
    }


    async setLead(
        token,
        saisonChansonId,
        lead
    ) {

        const { data, error } =
            await this.supabase.rpc(
                "set_saison_chanson_lead",
                {
                    p_token: token,

                    p_saison_chanson_id:
                        saisonChansonId,

                    p_lead:
                        lead
                }
            );


        if (error) {
            throw error;
        }


        return data?.[0] || null;
    }

    async findBySaisonAndChanson(saisonId, chansonId) {
        return await this.supabase
            .from(this.table)
            .select(`
            id,
            saison_chanson_id,
            saison_chanteur_id,
            saison_chansons!inner (
                id,
                saison_id,
                chanson_id
            )
        `)
            .eq("saison_chansons.saison_id", saisonId)
            .eq("saison_chansons.chanson_id", chansonId)
            .is("saison_chansons.deleted_at", null)
            .is("deleted_at", null);
    }
}