import { ReferentielDocumentMapper } from "../mappers/ReferentielDocumentMapper";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { ReferentielDocumentRepository } from "../repositories/ReferentielDocumentRepository";
import { ReferentielDocumentValidator } from "../validators/ReferentielDocumentValidator";
import { BaseService } from "./BaseService";
import StorageService from "./StorageService";

export class ReferentielDocumentService extends BaseService {

    constructor(repository  = new ReferentielDocumentRepository(), validator = new ReferentielDocumentValidator(), mapper= new ReferentielDocumentMapper()) {
        super(repository, validator, mapper);
        this.documentTypeRepository = new DocumentTypeRepository("document_types");
    }

    async getAvailableDocumentTypes() {

        const { data, error } =
            await this.documentTypeRepository.findAllActive();

        if (error) {
            return {
                success: false,
                data: [],
                error: error.message
            };
        }

        return {
            success: true,
            data
        };
    }

    async getAll(orderBy = "titre") {

        const { data, error } =
            await this.repository.findAllNotDelete(orderBy);

        if (error) {
            return {
                success: false,
                errors: error
            };
        }

        const enrichedData = await Promise.all(
            data.map(async document => {



                if (!document?.path) {
                    return {
                        ...document,
                        document_url: null
                    };
                }

                const url =
                    await StorageService.createSignedUrl(
                        "referentiel-documents",
                        document.path,
                        3600
                    );

                return {
                    ...document,
                    document_url: url,
                };
            })
        );

        return {
            success: true,
            data: enrichedData
        };
    }
    async getTemplateUrl(type = "droit_image") {
        const { data, error } =
            await this.repository.findByType(type);

        if (error) {
            return {
                data: null,
                error
            };
        }

        if (!data?.path) {
            return {
                data: null,
                error: null
            };
        }

        const url =
            await StorageService.createSignedUrl(
                "referentiel-documents",
                data.path,
                3600
            );

        return {
            data: {
                ...data,
                url
            },
            error: null
        };
    }

    async findDocumentsChanteur(token) {

        return await StorageService.getChanteurDocuments(token);

        const { data, error } =
            await this.repository.findDocumentsChanteur();

        if (error) {
            return {
                success: false,
                errors: error
            };
        }

        const enrichedData = await Promise.all(
            data.map(async document => {

                if (!document?.path) {
                    return {
                        ...document,
                        downloadUrl: null
                    };
                }

                const url =
                    await StorageService.createSignedUrl(
                        "referentiel-documents",
                        document.path,
                        3600
                    );

                return {
                    ...document,
                    downloadUrl: url
                };
            })
        );

        return {
            success: true,
            data: enrichedData
        };
    }
    async saveParoles({
        id = null,
        chansonTitre,
        path
    }) {

        // Récupérer le type de document "paroles"
        const {
            data: documentType,
            error: documentTypeError
        } = await this.documentTypeRepository.findByCode(
            "paroles"
        );

        if (documentTypeError) {
            return {
                success: false,
                error: documentTypeError.message
            };
        }

        if (!documentType) {
            return {
                success: false,
                error: "Le type de document 'paroles' n'existe pas."
            };
        }

        const document = {
            titre: `Paroles - ${chansonTitre}`,
            document_type_id: documentType.id,
            path
        };

        /*
         * Si id est présent :
         * BaseService.save() fera UPDATE.
         *
         * Si id est absent :
         * BaseService.save() fera INSERT.
         */
        if (id) {
            document.id = id;
        }

        return this.save(document);
    }

}