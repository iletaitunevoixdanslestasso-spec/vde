import { BaseRepository } from "./BaseRepository";


export class RendezvouRepository extends BaseRepository {

    constructor(table) {
        super(table);
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
    async findForDashboard() {

        return this.supabase
            .from(this.table)
            .select(`
            id,
            titre,
            date,
            heure_rdv,
            heure_debut,
            heure_fin_previsionnelle,
            description,
            rendezvous_type (
                id,
                libelle,
                code
            )
        `)
            .is("deleted_at", null)
            .order("date", { ascending: true });

    }
}
