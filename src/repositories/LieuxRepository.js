
import { BaseRepository } from "./BaseRepository";

export class LieuxRepository extends BaseRepository {

    constructor(table) {
        super(table);
    }

    async setPourRepetition(id) {

        const { data, error } =
            await this.supabase.rpc(
                "set_lieu_pour_repetition",
                { p_lieu_id: id }
            );

        return { data, error };
    }
}
