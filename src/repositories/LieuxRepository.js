import { BaseRepository } from "./BaseRepository";


export class LieuxRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    async setPourRepetition(id) {

        /*
         * 1. Marquer le lieu comme
         *    lieu de répétition par défaut
         */

        const {
            data: lieu,
            error: lieuError
        } =
            await this.supabase
                .from(this.table)
                .update({
                    repetition: true
                })
                .eq("id", id)
                .is("deleted_at", null)
                .select()
                .single();


        if (lieuError) {
            return {
                data: null,
                error: lieuError
            };
        }


        /*
         * 2. Chercher le type "repet"
         */

        const {
            data: typeRepetition,
            error: typeError
        } =
            await this.supabase
                .from("rendezvous_type")
                .select("id")
                .eq("code", "repet")
                .is("deleted_at", null)
                .single();


        if (typeError) {
            return {
                data: null,
                error: typeError
            };
        }


        /*
         * 3. Le rendez-vous générique
         *    utilise désormais ce lieu.
         */

        const {
            error: rendezvousError
        } =
            await this.supabase
                .from("rendezvous")
                .update({
                    lieu_id: id
                })
                .eq(
                    "rendezvous_type_id",
                    typeRepetition.id
                )
                .is("deleted_at", null);


        if (rendezvousError) {
            return {
                data: null,
                error: rendezvousError
            };
        }


        return {
            data: lieu,
            error: null
        };
    }
}
