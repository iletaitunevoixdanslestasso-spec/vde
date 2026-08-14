import { BaseRepository } from "./BaseRepository";

export class ChanteurRepository extends BaseRepository {
    constructor(table) {
        super(table);
    }

    async findAllAndSaison(saisonId, orderBy = "created_at") {
        return this.supabase
            .from(this.table)
            .select(`
            id,
            nom,
            prenom,
            saison_chanteurs!left (
                saisons(nom),
                id,
                saison_id,
                deleted_at
            )
        `)
            .eq("saison_chanteurs.saison_id", saisonId)
            .order(orderBy, { ascending: true });
    }


    /*
     * Profil chanteur
     */
    async findByToken(token) {

        return this.supabase.rpc(
            "get_mon_profil",
            {
                p_token: token
            }
        );
    }
    async updateByToken(token, data) {

        return this.supabase.rpc(
            "update_mon_profil",
            {
                p_token: token,
                p_nom: data.nom,
                p_prenom: data.prenom,
                p_email: data.email,
                p_groupe_id: data.groupe_id,
                p_pupitre_id: data.pupitre_id,
                p_telephone: data.telephone
            }
        );
    }

}