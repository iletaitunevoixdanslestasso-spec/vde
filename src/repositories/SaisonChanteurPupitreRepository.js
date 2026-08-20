import { BaseRepository } from "./BaseRepository";

export class SaisonChanteurPupitreRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    /**
     * Récupère les chansons d'une saison avec
     * les pupitres disponibles pour chaque chanson.
     */
    async findChansonsAvecPupitres(saisonId) {

        const { data, error } = await this.supabase
            .from("saison_chansons")
            .select(`
                id,
                saison_id,
                chanson_id,
                chansons!inner (
                    id,
                    titre,
                    referentiel_documents(
                        path
                    ),
                    chanson_pupitres (
                        id,
                        pupitre_id,
                        audio_url,
                        pupitres (
                            id,
                            nom
                        )
                    )
                )
            `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null)
            .is("chansons.deleted_at", null);

        if (error) {
            throw error;
        }

        return data || [];
    }

    /**
     * Récupère les choix de pupitre du chanteur
     * pour une saison.
     */

    async findBySaisonAndChanteur(
        token,
        saisonId,
        chanteurId
    ) {

        const { data, error } =
            await this.supabase.rpc(
                "get_saison_chanteur_pupitres",
                {
                    p_token: token,
                    p_saison_id: saisonId,
                    p_chanteur_id: chanteurId
                }
            );

        if (error) {
            throw error;
        }

        return data || [];
    }
    /**
     * Récupère le choix du chanteur pour une chanson.
     */
    async findBySaisonChanteurChanson(
        saisonId,
        chanteurId,
        chansonId
    ) {

        const { data, error } = await this.supabase
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
            .eq("chanteur_id", chanteurId)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }



    async findBySaisonAndChanson(saisonId, chansonId) {

        const { data, error } = await this.supabase
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

    async savePupitre(
        token,
        saisonId,
        chanteurId,
        chansonId,
        pupitreId
    ) {

        return this.supabase.rpc(
            "save_saison_chanteur_pupitre",
            {
                p_token: token,
                p_saison_id: saisonId,
                p_chanteur_id: chanteurId,
                p_chanson_id: chansonId,
                p_pupitre_id: pupitreId
            }
        );
    }
    /**
     * tous les pupitres appartenant aux chanteurs d'une saison donnée.
     */
    async findBySaison(saisonId) {
        return await this.supabase
            .from(this.table)
            .select(`
            id,
            saison_chanteur_id,
            chanson_id,
            pupitre_id,
            principal,
            saison_chanteurs!saison_chanteur_pupitres_saison_chanteur_id_fkey (
                id,
                saison_id,
                chanteur_id
            )
        `)
            .eq("saison_chanteurs.saison_id", saisonId)
            .is("deleted_at", null);
    }
    async findBySaison_old(saisonId) {
        return await this.supabase
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
            .is("deleted_at", null);


        // const { data, error } = await this.supabase
        //     .from(this.table)
        //     .select(`
        //     id,
        //     saison_id,
        //     chanteur_id,
        //     chanson_id,
        //     pupitre_id,
        //     principal
        // `)
        //     .eq("saison_id", saisonId)
        //     .is("deleted_at", null);

        // if (error) {
        //     throw error;
        // }

        // return data || [];
    }
    async findBySaisonChanteur(saisonChanteurId) {

        const { data, error } = await this.supabase
            .from(this.table)
            .select(`
            id,
            saison_chanteur_id,
            chanson_id,
            pupitre_id,
            principal
        `)
            .eq("saison_chanteur_id", saisonChanteurId)
            .is("deleted_at", null);

        if (error) {
            throw error;
        }

        return data || [];
    }


    async findBySaisonChanteurChanson(
        saisonChanteurId,
        chansonId
    ) {

        const { data, error } = await this.supabase
            .from(this.table)
            .select(`
            id,
            saison_chanteur_id,
            chanson_id,
            pupitre_id,
            principal
        `)
            .eq("saison_chanteur_id", saisonChanteurId)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

}