import { supabase } from "../core/supabase/client";

export class ChanteurPupitresSaisonActiveRepository {

    constructor() {
        this.table =
            "v_chanteur_pupitres_saison_active";
    }


    async findByChanson(chansonId) {

        return supabase
            .from(this.table)
            .select("*")
            .eq("chanson_id", chansonId)
            .order("pupitre_nom", {
                ascending: true
            })
            .order("chanteur_nom", {
                ascending: true
            })
            .order("chanteur_prenom", {
                ascending: true
            });
    }


    async findByChansons(chansonIds) {

        if (!chansonIds?.length) {
            return {
                data: [],
                error: null
            };
        }

        return supabase
            .from(this.table)
            .select("*")
            .in("chanson_id", chansonIds)
            .order("chanson_titre", {
                ascending: true
            })
            .order("pupitre_nom", {
                ascending: true
            })
            .order("chanteur_nom", {
                ascending: true
            })
            .order("chanteur_prenom", {
                ascending: true
            });
    }
}