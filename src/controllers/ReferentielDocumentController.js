import { BaseController } from "./BaseController";


export class ReferentielDocumentController extends BaseController {

    constructor(service) {
        super(service);
    }

    async prepareForm_old() {

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



    async prepareForm(currentDocument = null) {

        const result =
            await this.service.getAvailableDocumentTypes(
                currentDocument?.id ?? null
            );

        const droitImageType =
            result.success
                ? result.data.find(
                    type => type.code === "droit_image"
                )
                : null;

        return {
            availableDocumentTypes: result.success
                ? result.data.map(type => ({
                    id: type.id,
                    value: type.libelle
                }))
                : [],

            droitImageTypeId: droitImageType?.id ?? null
        };
    }
    async loadDocumentsChanteur(token) {

        const documents =
            await this.service.findDocumentsChanteur(token);

        console.error(documents);

        return documents;
    }

}
