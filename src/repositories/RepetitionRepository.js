import { BaseRepository } from "./BaseRepository";
import { RendezvouRepository } from "./RendezvouRepository";


export class RepetitionRepository extends RendezvouRepository {

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
            .gte("date", new Date().toISOString().split("T")[0])
            .eq("saison_id", saisonId)
            ;
    }

    async findDuJourPourChanteur(saisonId, saisonChanteurId) {

        const aujourdHui = new Date()
            .toISOString()
            .split("T")[0];

        console.log("findDuJourPourChanteur");
        console.log("saisonId :", saisonId);
        console.log("saisonChanteurId :", saisonChanteurId);
        console.log("aujourdHui :", aujourdHui);

        return this.supabase
            .from("repetitions")
            .select(`
            id,
            saison_id,
            date,
            description,
            accompagne,
            rendezvous_id,

            rendezvous(
                id,
                titre,
                description,
                heure_rdv,
                heure_debut,
                heure_fin_previsionnelle,
                deleted_at
            ),

            repetition_chanteurs(
                id,
                saison_chanteur_id,
                participe
            )
        `)
            .eq("saison_id", saisonId)
            .eq("date", aujourdHui)
            .eq(
                "repetition_chanteurs.saison_chanteur_id",
                saisonChanteurId
            )
            .is("deleted_at", null)
            .is("rendezvous.deleted_at", null)
            .maybeSingle();
    }

    async saveParticipation(
        token,
        saisonChanteurId,
        repetitionId,
        participe
    ) {

        return this.supabase.rpc(
            "save_repetition_chanteur_participation",
            {
                p_token: token,
                p_repetition_id: repetitionId,
                p_saison_chanteur_id: saisonChanteurId,
                p_participe: participe
            }
        );
    }
}
