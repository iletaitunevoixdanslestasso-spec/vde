import { BaseService } from "./BaseService";


export class LieuxService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
    }


    async setPourRepetition(id) {

        const { data, error } =
            await this.repository.setPourRepetition(id);


        if (error) {

            return {
                success: false,
                message: error.message
            };
        }


        return {
            success: true,
            data
        };
    }



    
}
