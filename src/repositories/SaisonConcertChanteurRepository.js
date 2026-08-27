import { BaseRepository } from "./BaseRepository";


export class SaisonConcertChanteurRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }
    async findBySaisonAndChanteur(
        token,
        saisonId,
        chanteurId
    ) {
        console.log(token,
            saisonId,
            chanteurId)
        return this.supabase
            .from(this.table)
            .select(`
            *,
            saison_rendezvous!inner(*),
            saison_chanteurs!inner(*)
        `)
            .is("deleted_at", null)
            .is("saison_rendezvous.deleted_at", null)
            .is("saison_chanteurs.deleted_at", null)
            .eq("saison_chanteurs.saison_id", saisonId)
            .eq("saison_chanteurs.chanteur_id", chanteurId)
            ;
    }

    async saveParticipation(token, saisonRendezvousId, saisonChanteurId, participe) {
        return await this.supabase
            .from(this.table)
            .upsert(
                {
                    saison_rendezvous_id: saisonRendezvousId,
                    saison_chanteur_id: saisonChanteurId,
                    participe: participe,
                    deleted_at: null
                },
                {
                    onConflict: "saison_rendezvous_id,saison_chanteur_id"
                }
            )
            .select()
            .single();

        // if (error) {
        //     throw error;
        // }

        // return data;
    }



    async findTypeConcert() {

        return this.supabase
            .from('rendezvous_type')
            .select(`
            
                id,
                libelle,
                code
            
        `)
            .eq("code", "concert")
            .is("deleted_at", null)
            .maybeSingle();
    }
    async findTypeRepetition() {

        return this.supabase
            .from(this.table)
            .select(`
            *,
            rendezvous_type!inner(
                id,
                libelle,
                code
            )
        `)
            .eq("rendezvous_type.code", "repet")
            .is("deleted_at", null)
            .maybeSingle();
    }


    async findBySaisonAndTypeConcert(saisonId) {
        console.log("findBySaisonAndTypeConcert", saisonId)
        return this.supabase
            .from(this.table)
            .select(`
            *,
            lieux(*),
            saison_rendezvous!inner(*),
            rendezvous_type!inner(
                id,
                libelle,
                code
            )
        `)
            .eq("rendezvous_type.code", "concert")
            .is("deleted_at", null)
            .eq("saison_rendezvous.saison_id", saisonId)
            ;
    }

    async findByTypeConcert() {

        return this.supabase
            .from(this.table)
            .select(`
            *,
            lieux(*),
            rendezvous_type!inner(
                id,
                libelle,
                code
            )
        `)
            .eq("rendezvous_type.code", "concert")
            .is("deleted_at", null)
            ;
    }

    async findForDashboard(saisonId) {

        return this.supabase
            .from('saison_rendezvous')
            .select(`
                id,
                rendezvous!inner(
                    id,
                    titre,
                    date,
                    heure_rdv,
                    heure_debut,
                    heure_fin_previsionnelle,
                    description,
                    deleted_at,
                    rendezvous_type (
                        id,
                        libelle,
                        code
                    )
                )
            `)
            .eq("saison_id", saisonId)
            .gte("rendezvous.date", new Date().toISOString().split("T")[0])
            .is("deleted_at", null)
            .is("rendezvous.deleted_at", null)
            .order("id", { ascending: true });

    }
    async findLieux() {

        const { data, error } = await this.supabase
            .from("lieux")
            .select(`
            id,
            nom,
            rue,
            ville,
            code_postale,
            description
        `)
            .is("deleted_at", null)
            .order("ville")
            .order("rue");

        if (error) {
            throw error;
        }

        return data;
    }
    async createLieu(data) {

        const { data: lieu, error } =
            await this.supabase
                .from("lieux")
                .insert(data)
                .select()
                .single();

        if (error) {
            throw error;
        }

        return lieu;
    }
    async createSaisonRendezvous(data) {

        const { data: lieu, error } =
            await this.supabase
                .from("saison_rendezvous")
                .insert(data)
                .select()
                .single();

        if (error) {
            throw error;
        }

        return lieu;
    }
    async findByConcert(saisonRendezvousId) {
        return this.supabase
            .from(this.table)
            .select(`
            id,
            saison_rendezvous_id,
            saison_chanteur_id,
            participe,
            saison_chanteurs (
                id,
                saison_id,
                chanteur_id,
                chanteurs (
                    id,
                    nom,
                    prenom,
                    email,
                    telephone
                )
            )
        `)
            .eq("saison_rendezvous_id", saisonRendezvousId)
            .eq("participe", true)
            .is("deleted_at", null);
    }
}
