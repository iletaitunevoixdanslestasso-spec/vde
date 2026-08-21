import { BaseRepository } from "./BaseRepository";


export class RepetitionRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }
    async findBySaison(saisonId) {
        return this.supabase
            .from(this.table)
            .select(`
                id,
                accompagne,
                date,
                description,
                repetitions_type_id,
                repetitions_type(
                    id,
                    libelle,
                    duree
                ),
                rendezvous_id,
                rendezvous(
                    lieux(
                        rue,
                        ville,
                        code_postale,
                        description),
                    titre,
                    description,
                    rendezvous_type(
                        id,
                        libelle
                    )
                )
            `)
            .is("deleted_at", null)
            .eq("saison_id", saisonId)
            ;
    }   

}
