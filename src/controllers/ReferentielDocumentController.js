import { BaseController } from "./BaseController";


export class ReferentielDocumentController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm() {

        const result =
            await this.service.getAvailableDocumentTypes();

        return {
            availableDocumentTypes: result.success
                ? result.data.map(type => ({
                    id: type.id,
                    value: type.libelle
                }))
                : []
        };
    }
    async loadDocumentsChanteur(token) {

        const documents =
            await this.service.findDocumentsChanteur(token);

        console.log(documents);

        return documents;
    }

}
