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

    async findBySaisonAndTypeAutres(saisonId) {
        console.error("findBySaisonAndTypeAutres", saisonId)
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
            .neq("rendezvous_type.code", "concert")
            .neq("rendezvous_type.code", "repet")
            .is("deleted_at", null)
            .eq("saison_rendezvous.saison_id", saisonId)
            .order('date', { ascending: true });
        ;
    }
    async findBySaisonAndTypeConcert_old(saisonId) {
        console.error("findBySaisonAndTypeConcert", saisonId)
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
    async findBySaisonAndTypeConcert(saisonId) {

        const { data, error } = await this.supabase
            .from("vue_saison_rendezvous_participation")
            .select(`
            saison_rendezvous_id,
            saison_id,
            rendezvous_id,

            presents,
            absents,
            ne_sait_pas,

            rendezvous!inner(
                *,
                
                lieux(*),

                saison_rendezvous!inner(*),

                rendezvous_type!inner(
                    id,
                    libelle,
                    code
                )
            )
        `)
            .eq("saison_id", saisonId)
            .eq("rendezvous.rendezvous_type.code", "concert")
            .is("rendezvous.deleted_at", null);

        if (error) {
            return {
                data: null,
                error
            };
        }

        /*
         * Remise au format historique attendu
         * par ConcertService
         */
        const result = data.map(row => {

            const rendezvous = row.rendezvous;

            return {
                ...rendezvous,

                /*
                 * Les compteurs viennent de la vue
                 */
                presents: row.presents ?? 0,
                absents: row.absents ?? 0,
                ne_sait_pas: row.ne_sait_pas ?? 0
            };
        });

        /*
         * Même tri qu'avant
         */
        result.sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });

        return {
            data: result,
            error: null
        };
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
    async findType() {

        const { data, error } = await this.supabase
            .from("rendezvous_type")
            .select(`
            id,
            libelle,
            code,
            description
        `)
            .is("deleted_at", null)
            .neq('code')
            .notIn('code', ['repet', 'concert'])
            .order("libelle")
            ;

        if (error) {
            throw error;
        }

        return data;
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
            description,
            repetition
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

    async updateLieu(rendezvousId, lieuId) {

        const { data, error } = await this.supabase
            .from("rendezvous")
            .update({
                lieu_id: lieuId
            })
            .eq("id", rendezvousId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
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

    async findLieuRepetition() {

        return this.supabase
            .from("lieux")
            .select(`
            id,
            nom,
            rue,
            ville,
            code_postale,
            description,
            repetition
        `)
            .eq("repetition", true)
            .is("deleted_at", null)
            .maybeSingle();
    }

    async findRendezvousById(id) {

        return this.supabase
            .from("rendezvous")
            .select(`
            *,
            lieux(*),
            rendezvous_type(
                id,
                code,
                libelle
            )
        `)
            .eq("id", id)
            .maybeSingle();
    }


    async findRendezvousTypeByCode(code) {

        return this.supabase
            .from("rendezvous_type")
            .select(`
            id,
            code,
            libelle
        `)
            .eq("code", code)
            .is("deleted_at", null)
            .maybeSingle();
    }


    async createRepetitionSpecific({
        rendezvousSource,
        lieuId,
        date
    }) {

        const {
            data: type,
            error: typeError
        } =
            await this.findRendezvousTypeByCode(
                "repetition_spe"
            );


        if (typeError) {
            throw typeError;
        }

        if (!type) {
            throw new Error(
                "Le type de rendez-vous repetition_spe n'existe pas."
            );
        }


        const { data, error } =
            await this.supabase
                .from("rendezvous")
                .insert({

                    rendezvous_type_id:
                        type.id,

                    lieu_id:
                        lieuId,

                    /*
                     * On reprend les caractéristiques
                     * du rendez-vous répétition générique.
                     */
                    titre:
                        rendezvousSource.titre,

                    date:
                        date,

                    heure_rdv:
                        rendezvousSource.heure_rdv,

                    heure_debut:
                        rendezvousSource.heure_debut,

                    duree_previsionnelle:
                        rendezvousSource.duree_previsionnelle,

                    description:
                        rendezvousSource.description

                })
                .select()
                .single();


        if (error) {
            throw error;
        }

        return data;
    }


    async updateRepetitionSpecific(
        rendezvousId,
        {
            lieuId,
            date
        }
    ) {

        const { data, error } =
            await this.supabase
                .from("rendezvous")
                .update({
                    lieu_id: lieuId,
                    date
                })
                .eq("id", rendezvousId)
                .select()
                .single();


        if (error) {
            throw error;
        }

        return data;
    }
}
