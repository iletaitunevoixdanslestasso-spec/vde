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
            path: result.path
        };

    }, [
        field.field,
        field.signedUpload,
        context.token
    ]);


    useEffect(() => {

        onFileUploadReady?.(upload);

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
    const storagePath =
        field.signedUpload
            ? `${form.id}/droit_image.pdf`
            : (
                form[field.field]
                || null
            );


    return (
        <FileUploader

            ref={uploaderRef}

            bucket={field.bucket}

            path={storagePath}

            accept={field.accept}

            showUploadButton={false}

            onUploaded={(result) => {

                onChange(
                    field.field,
                    result.path
                );

            }}

        />
    );
}