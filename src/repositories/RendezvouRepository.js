import { BaseRepository } from "./BaseRepository";


export class RendezvouRepository extends BaseRepository {

    constructor(table) {
        super(table);
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
            .order('date', { ascending: true });
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

    async findForDashboard(chanteur) {
        const saisonId = chanteur?.saison_id
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
                    lieux(*),
                    heure_fin_previsionnelle,
                    description,
                    deleted_at,
                    rendezvous_type (
                        id,
                        libelle,
                        code
                    )
                ),
                saison_concert_chanteurs(
                    id,
                    participe
                )
            `)
            .eq("saison_id", saisonId)
            .eq("saison_concert_chanteurs.saison_chanteur_id", chanteur.saisonChanteur.id)
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
}
