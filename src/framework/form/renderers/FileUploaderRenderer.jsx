import {
    useCallback,
    useEffect,
    useRef
} from "react";

import FileUploader from "../../../core/framework/FileUploader";
import StorageService from "../../../services/StorageService";


export default function FileUploaderRenderer({
    field,
    form,
    onChange,
    context,
    onFileUploadReady
}) {

    const uploaderRef = useRef(null);


    const upload = useCallback(async () => {
        // Aucun nouveau fichier sélectionné :
        // surtout ne pas demander de token d'upload.
        if (!uploaderRef.current?.hasFile()) {
            return null;
        }
        /*
         * CHANTEUR :
         * le token métier permet d'obtenir
         * un token d'upload signé.
         */
        if (field.signedUpload) {

            const signedUpload =
                await StorageService.createChanteurDroitImageUpload(
                    context.token
                );

            const result =
                await uploaderRef.current?.uploadWithSignedToken(
                    signedUpload.token
                );

            if (!result) {
                return null;
            }

            if (result.skipped) {
                return result;
            }

            return {
                field: field.field,
                path: result.path
            };
        }


        /*
         * FONCTIONNEMENT NORMAL :
         * admin référentiel, chanson, etc.
         */
        const result =
            await uploaderRef.current?.upload();

        if (!result) {
            return null;
        }

        if (result.skipped) {
            return result;
        }

        return {
            field: field.field,
            result,
            path: result.path,
            name: result.file.name,
        };

    }, [
        field.field,
        field.signedUpload,
        context.token
    ]);


    useEffect(() => {

        onFileUploadReady?.(upload);
        return () => {
            onFileUploadReady?.(null);
        };

    }, [
        onFileUploadReady,
        upload
    ]);


    /*
     * Pour le chanteur :
     *   chanteur_id/droit_image.pdf
     *
     * Pour les autres usages :
     *   valeur déjà présente ou null
     */


const isDroitImage =
    !!context.droitImageTypeId &&
    form.document_type_id === context.droitImageTypeId;



const existingValue = form[field.field];

const existingPath =
    typeof existingValue === "string"
        ? existingValue
        : existingValue?.path || null;

const storagePath =
    field.signedUpload
        ? `${form.id}/droit_image.pdf`
        : isDroitImage
            ? "droit_image/droit_image.pdf"
            : existingPath;

            
    return (
        <FileUploader
            ref={uploaderRef}
            bucket={field.bucket}
            path={storagePath}
            accept={field.accept}
            folder={field.documentTypeCode}
            showUploadButton={false}
            onUploaded={(result) => {
                console.error(field)
                console.error(result)
                onChange(
                    result,
                    field.field,
                    result.path,
                    // result.file.name,
                );

            }}

        />
    );
}