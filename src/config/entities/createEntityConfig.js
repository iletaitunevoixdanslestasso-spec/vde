import { BaseController } from "../../controllers/BaseController";

import { BaseRepository } from "../../repositories/BaseRepository";
import { BaseService } from "../../services/BaseService";
import { BaseValidator } from "../../validators/BaseValidator";
import { BaseMapper } from "../../mappers/BaseMapper";


import { baseConfig } from "./base.config";


export function createEntityConfig({
    entity,
    title,
    table,

    columns = [],

    Repository = BaseRepository,
    Service = BaseService,
    Validator = BaseValidator,
    Mapper = BaseMapper,
    Controller = BaseController,
    actions = [],
    useBaseActions = true,
    ...options

}) {


    const repository = new Repository(table);

    const validator = new Validator(columns);

    const mapper = new Mapper(columns);


    const service = new Service(
        repository,
        validator,
        mapper
    );


    const controller = new Controller(service);


    return {

        ...baseConfig,

        entity,
        title,
        table,

        repository,
        validator,
        mapper,
        service,
        controller,

        columns,
        actions: useBaseActions
            ? [
                ...actions,
                ...baseConfig.actions,
            ]
            : [
                ...actions
            ],

        ...options

    };

}