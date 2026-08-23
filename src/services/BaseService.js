import { BaseResponse } from "../core/framework/BaseResponse";

export class BaseService {
    mapper = null;
    context = {};

    constructor(repository, validator = null, mapper = null) {
        this.repository = repository;
        this.validator = validator;
        this.mapper = mapper;
    }
    initialize(context = {}) {

        this.context = Object.freeze({
            ...context
        });

    }
    // 📦 GET ALL
    async getAll(orderBy = "created_at") {
        const { data, error } = await this.repository.findAllNotDelete(orderBy);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(   data.map(e => this.mapper.toUi(e)));
    }

    // 📦 GET BY ID
    async getById(id) {
        const { data, error } = await this.repository.findById(id);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(this.mapper.toUi(data));
    }

    // 💾 SAVE (CREATE / UPDATE)
    async save(entity) {
        console.log("BaseService.save", entity);
        // 🧠 VALIDATION (optionnelle)
        if (this.validator) {
            const validation = this.validator.validate(entity);
            console.log("validation", validation);
            if (!validation.valid) {
                return BaseResponse.error(validation.errors);
            }
        }

        let result;
        
        const dbEntity = this.mapper ? this.mapper.toDb(entity) : entity;
        console.log("dbEntity", dbEntity);
        if (entity.id) {
            result = await this.repository.update(entity.id, dbEntity);
        } else {
            result = await this.repository.insert(dbEntity);
        }

        if (result.error) {
            return BaseResponse.error([], result.error.message);
        }
        console.log("result", result);

        return BaseResponse.success(this.mapper.toUi(result.data));
    }

    // 🗑️ DELETE (soft ou hard selon repo)
    async delete(id) {
        const { error } = await this.repository.delete(id);

        if (error) {
            return BaseResponse.error([], error.message);
        }

        return BaseResponse.success(null, "Suppression réussie");
    }
}