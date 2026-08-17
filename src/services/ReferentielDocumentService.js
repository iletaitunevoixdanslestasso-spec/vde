import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { BaseService } from "./BaseService";
import StorageService from "./StorageService";

export class ReferentielDocumentService extends BaseService {

    constructor(repository, validator, mapper) {
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
                    document_url: url
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
}