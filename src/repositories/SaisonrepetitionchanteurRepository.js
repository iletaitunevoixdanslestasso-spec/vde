import { BaseRepository } from "./BaseRepository";

export class SaisonRepetitionChanteurRepository
    extends BaseRepository {

    constructor(table) {
        super(table);
    }

    async findBySaisonAndRepetition(
        saisonId,
        repetitionId
    ) {

        return await this.supabase
            .from("saison_chanteurs")
            .select(`
                id,
                saison_id,
                chanteur_id,
                chanteurs (
                    id,
                    nom,
                    prenom,
                    email
                ),
                repetition_chanteurs (
                    id,
                    repetition_id,
                    saison_chanteur_id,
                    participe,
                    created_at,
                    updated_at
                )
            `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null)
            .eq("repetition_chanteurs.repetition_id", repetitionId)
            .is("repetition_chanteurs.deleted_at", null);

        if (error) {
            throw error;
        }

        return data;
    }

    async saveParticipation(
        repetitionId,
        saisonChanteurId,
        participe
    ) {
        const { data, error } =
            await this.supabase
                .from("repetition_chanteurs")
                .upsert(
                    {
                        repetition_id: repetitionId,
                        saison_chanteur_id: saisonChanteurId,
                        participe
                    },
                    {
                        onConflict:
                            "repetition_id,saison_chanteur_id"
                    }
                )
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    }
}