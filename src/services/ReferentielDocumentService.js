import { BaseResponse } from "../core/framework/BaseResponse";
import { ReferentielDocumentMapper } from "../mappers/ReferentielDocumentMapper";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { ReferentielDocumentRepository } from "../repositories/ReferentielDocumentRepository";
import { ReferentielDocumentValidator } from "../validators/ReferentielDocumentValidator";
import { BaseService } from "./BaseService";
import StorageService from "./StorageService";

export class ReferentielDocumentService extends BaseService {

    constructor(repository = new ReferentielDocumentRepository(), validator = new ReferentielDocumentValidator(), mapper = new ReferentielDocumentMapper()) {
        super(repository, validator, mapper);
        this.documentTypeRepository = new DocumentTypeRepository("document_types");
    }

    async getAvailableDocumentTypes_old() {

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
    async getAvailableDocumentTypes(currentDocumentId = null) {

        const { data: types, error } =
            await this.documentTypeRepository.findAllActive();

        if (error) {
            return {
                success: false,
                data: [],
                error: error.message
            };
        }

        const {
            data: droitImageDocuments,
            error: droitImageError
        } = await this.repository.findDroitImage();

        if (droitImageError) {
            return {
                success: false,
                data: [],
                error: droitImageError.message
            };
        }

        const droitImageExisteAilleurs =
            droitImageDocuments.some(
                document => document.id !== currentDocumentId
            );

        return {
            success: true,
            data: droitImageExisteAilleurs
                ? types.filter(type => type.code !== "droit_image")
                : types
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
    async save(entity) {

        const {
            data: documentType,
            error: documentTypeError
        } = await this.documentTypeRepository.findById(
            entity.document_type_id
        );

        if (documentTypeError) {
            return BaseResponse.error(
                [],
                documentTypeError.message
            );
        }

        if (documentType?.code === "droit_image") {

            const {
                data: documents,
                error
            } = await this.repository.findDroitImage();

            if (error) {
                return BaseResponse.error(
                    [],
                    error.message
                );
            }

            const autreDroitImageExiste =
                documents.some(
                    document => document.id !== entity.id
                );

            if (autreDroitImageExiste) {
                return BaseResponse.error(
                    [{
                        field: "document_type_id",
                        message:
                            "Un document Droit à l'image existe déjà."
                    }],
                    "Un seul document Droit à l'image est autorisé."
                );
            }
        }

        return super.save(entity);
    }
    async delete(id) {
        // 1. Récupérer le document avant suppression
        const { data: document, error } =
            await this.repository.findById(id);

        if (error) {
            return BaseResponse.error(
                [],
                error.message
            );
        }

        // 2. Supprimer réellement le fichier du bucket
        if (document?.path) {

            try {
                await StorageService.remove(
                    "referentiel-documents",
                    document.path
                );
            } catch (error) {

                return BaseResponse.error(
                    [],
                    `Impossible de supprimer le fichier : ${error.message}`
                );
            }
        }

        // 3. Soft delete de la ligne
        return super.delete(id);
    }
}