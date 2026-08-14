export class BaseController {

    constructor(service) {
        this.service = service;
        this.context = {};
    }

    initialize(context = {}) {

        this.context = Object.freeze({
            ...context
        });

        if (this.service?.initialize) {
            this.service.initialize(this.context);
        }
    }




    async prepareForm() {
        return {};
    }

    async loadItemByToken() {

        return this.service.getByToken(
            this.context.token
        );

    }


    async saveItemByToken(form) {

        return this.service.updateByToken(
            this.context.token,
            form
        );
    }    

    async handle(serviceCall, { onSuccess, onError } = {}) {

        const res = await serviceCall();

        if (res.success) {
            onSuccess?.(res.data);
        } else {
            onError?.(res.errors);
        }

        return res;
    }

    async load(setState) {
        return this.handle(
            () => this.service.getAll(),
            {
                onSuccess: setState
            }
        );
    }

    async save(entity, onSuccess, onError) {
        return this.handle(
            () => this.service.save(entity),
            { onSuccess, onError }
        );
    }

    async delete(id, onSuccess, onError) {
        return this.handle(
            () => this.service.delete(id),
            { onSuccess, onError }
        );
    }

    async getById(id, onSuccess, onError) {
        return this.handle(
            () => this.service.getById(id),
            { onSuccess, onError }
        );
    }
    async getAll(onSuccess, onError) {
        return this.handle(
            () => this.service.getAll(),
            { onSuccess, onError }
        );
    }

}