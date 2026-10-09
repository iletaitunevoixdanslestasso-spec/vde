import { BaseRepository } from "./BaseRepository";


export class SaisonchansonRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }


    /**
     * Liste les chansons associés à une saison
     */
    async findBySaison(saisonId) {

        return this.supabase
            .from(this.table)
            .select(`
                id,
                saison_id,
                chanson_id,
                saison_chanson_leads!left (
                    id,
                    saison_chanteur_id,
                    deleted_at,
                    saison_chanteurs (
                        id,
                        chanteurs (
                            id,
                            nom,
                            prenom
                        )
                    )
                ),
                chansons (
                    id,
                    titre,
                    audio,
                    referentiel_documents(
                    path
                    )
                )
            `)
            .eq("saison_id", saisonId)
            .is("deleted_at", null)
            .is("saison_chanson_leads.deleted_at", null)
            .is("chansons.deleted_at", null)
            ;
    }


    /**
     * Active / désactive un lead sans supprimer la ligne.
     * saisonChansonId évite de modifier une autre chanson par erreur.
     */
    async setLeadActif(leadId, saisonChansonId, actif) {
        return this.supabase
            .from("saison_chanson_leads")
            .update({
                deleted_at: actif ? null : new Date().toISOString()
            })
            .eq("id", leadId)
            .eq("saison_chanson_id", saisonChansonId)
            .select("id, deleted_at")
            .maybeSingle();
    }


    /**
     * Vérifie si un chanson est déjà associé
     */
    async exists(saisonId, chansonId) {

        return this.supabase
            .from(this.table)
            .select("id")
            .eq("saison_id", saisonId)
            .eq("chanson_id", chansonId)
            .is("deleted_at", null)
            .maybeSingle();
    }

}
