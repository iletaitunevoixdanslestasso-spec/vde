import { ReferentielDocumentConfig } from "../config/entities/ReferentielDocument.config";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { ReferentielDocumentRepository } from "../repositories/ReferentielDocumentRepository";
import { BaseService } from "./BaseService";
import { ReferentielDocumentService } from "./ReferentielDocumentService";
import StorageService from "./StorageService";


export class ChansonService extends BaseService {

    constructor(repository, validator, mapper) {
        super(repository, validator, mapper);
        this.referentielDocumentRepository = new ReferentielDocumentRepository("referentiel_documents");
        this.documentTypeRepository = new DocumentTypeRepository("document_types");
        this.referentielDocumentService =
            new ReferentielDocumentService(
                // this.referentielDocumentRepository,
                // null,
                // null
            );
    }
    async getAvailableReferentielDocumentParoles() {


        const { data, error } =
            await this.referentielDocumentRepository.findByCode('paroles');


        if (error) {
            return {
                success: false,
                data: [],
                error: error.message
            };
        }
        // j'enlève des lignes de la able liaison les lignes dontle referentiel est null
        const filteredData = data.filter(item => item.document_types !== null);


        console.log(data)
        return {
            success: true,
            data: filteredData
        };
    }
    async save_old(data) {

        const form = {
            ...data
        };
        console.log(data)
        console.log(form)
        return
        /*
         * Un upload vient de FileUploader sous forme de path Storage.
         *
         * Lors d'une modification, form.paroles peut au contraire
         * être l'UUID du referentiel_document existant.
         */

        if (form.paroles && !this.isUuid(form.paroles)) {

            // 1. récupérer le type "paroles"
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

            // 2. créer le referentiel_document
            const {
                data: document,
                error: documentError
            } = await this.referentielDocumentRepository.insert({
                titre: `Paroles - ${form.titre}`,
                document_type_id: documentType.id,
                path: form.paroles
            });

            if (documentError) {
                return {
                    success: false,
                    error: documentError.message
                };
            }

            // 3. la chanson doit maintenant pointer vers l'UUID
            form.paroles = document.id;
        }

        // 4. sauvegarde normale de la chanson
        return super.save(form);
    }

    async save(data) {

        const form = {
            ...data
        };
        console.log("form", form)
        console.log("data", data)

        if (form.referentiel_documents) {
            // 1. récupérer le type "paroles"

            const {
                data: documentType,
                error: documentTypeError
            } = await this.documentTypeRepository.findByCode("paroles");

            console.log(data)
            console.log(documentType)
            
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
            // 2 contrcution du referentieldocument
            console.log(documentType)
            const document = {
                path: data.referentiel_documents_path,
                titre: `Paroles - ${form.titre}`,
                id:form.paroles,
                document_type_id: documentType.id,
            }
            console.log(document)
            const referentiel_documents = ReferentielDocumentConfig

            const result =
                await referentiel_documents.service.save(
                    document
                );

            console.log(result)
            if (!result.success) {
                return result;
            }
            form.paroles = result.data.id;

            delete form.referentiel_documents;
        }
        
        if (!this.isUuid(form.paroles)) {

        } 
        form.paroles = this.isUuid(form.paroles) ?  form.paroles : null
        return super.save(form);
    }

    isUuid(value) {
        return typeof value === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
            data.map(async chanson => {

                const document = chanson.referentiel_documents;

                if (!document?.path) {
                    return {
                        ...chanson,
                        paroles_url: null
                    };
                }

                const url =
                    await StorageService.createSignedUrl(
                        "referentiel-documents",
                        document.path,
                        3600
                    );

                return {
                    ...chanson,
                    paroles_url: url
                };
            })
        );

        return {
            success: true,
            data: enrichedData
        };
    }
}
