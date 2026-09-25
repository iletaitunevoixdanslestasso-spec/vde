import { BaseRepository } from "./BaseRepository";
import { supabase } from "../core/supabase/client";

export class SaisonRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    async findAllActives(orderBy = "date_debut") {

        const { data, error } = await supabase
            .from("saisons")
            .select(`id,nom, date_debut, date_fin, deleted_at, active, 
                chef_choeur,
                chef_choeur!left (
                    id,
                    nom,
                    prenom
                )
            `)
            // .not("deleted_at", "is", null)
            .is("deleted_at", null)
            .order(orderBy, { ascending: true })
            ;

        if (error) {
            throw error;
        }

        return data;
    }
    setActive(id) {
        return supabase.rpc(
            "set_active_saison",
            { p_id: id }
        );
    }

}