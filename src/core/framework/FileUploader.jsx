import {
    forwardRef,
    useImperativeHandle,
    useState
} from "react";

import StorageService from "../../services/StorageService";
import FileRenderer from "../../framework/form/renderers/FileRenderer";


const FileUploader = forwardRef(function FileUploader({
    bucket,
    path,
    accept = "*/*",
    maxSize = null,
    disabled = false,
    onChange,
    onUploaded,
    signedUpload = false,
    signedUploadToken = null,
    showUploadButton = true,
}, ref) {

    const [file, setFile] = useState(null);
    const [uploaded, setUploaded] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (selectedFile) => {
        setError(null);
        setUploaded(null);

        if (!selectedFile) {
            setFile(null);
            onChange?.(null);
            return;
        }

        if (
            maxSize !== null &&
            selectedFile.size > maxSize
        ) {
            setError(
                `Le fichier est trop volumineux. Taille maximale : ${Math.round(
                    maxSize / 1024 / 1024
                )} Mo.`
            );

            setFile(null);
            onChange?.(null);
            return;
        }

        setFile(selectedFile);
        onChange?.(selectedFile);
    };

    const upload = async () => {
        if (!file) {
            setError("Aucun fichier sélectionné.");
            return {
                skipped: true
            };
            // return null;
        }

        setUploading(true);
        setError(null);

        try {
            const result = await StorageService.upload(
                bucket,
                path || file.name,
                file
            );

            const url =
                await StorageService.createSignedUrl(
                    bucket,
                    result.path,
                    3600
                );

            const uploadedResult = {
                ...result,
                url,
            };

            setUploaded(uploadedResult);

            onUploaded?.(uploadedResult);

            return uploadedResult;

        } catch (error) {
            console.error(
                "FileUploader upload error",
                error
            );

            setError(
                error?.message ||
                "Une erreur est survenue pendant l'upload."
            );

            return null;

        } finally {
            setUploading(false);
        }
    };


    const uploadWithSignedToken = async (signedToken) => {

        if (!file) {
            setError("Aucun fichier sélectionné.");

            return {
                skipped: true
            };
        }

        setUploading(true);
        setError(null);

        try {

            const result =
                await StorageService.uploadToSignedUrl(
                    bucket,
                    path,
                    signedToken,
                    file
                );

            /*
             * uploadToSignedUrl retourne seulement les
             * informations du Storage. On reconstruit
             * le même format que upload().
             */
            const uploadedResult = {
                ...result,
                path,
            };

            /*
             * Comme pour upload(), on conserve le résultat
             * dans le composant.
             */
            setUploaded(uploadedResult);

            onUploaded?.(uploadedResult);

            return uploadedResult;

        } catch (error) {

            console.error(
                "FileUploader signed upload error",
                error
            );

            setError(
                error?.message ||
                "Une erreur est survenue pendant l'upload."
            );

            return null;

        } finally {
            setUploading(false);
        }
    };


    useImperativeHandle(ref, () => ({
        upload,
        uploadWithSignedToken
    }));


    return (
        <div>

            <FileRenderer
                field="file"
                file={file}
                onChange={handleFileChange}
                disabled={disabled || uploading}
                accept={accept}
                error={error}
            />

            {file && !uploaded && showUploadButton && (
                <button
                    type="button"
                    onClick={upload}
                    disabled={disabled || uploading}
                >
                    {uploading
                        ? "Upload..."
                        : "Uploader"}
                </button>
            )}

            {uploaded && (
                <div>
                    <p>
                        <strong>Upload terminé</strong>
                    </p>

                    <p>
                        Path : {uploaded.path}
                    </p>

                    <p>
                        ID : {uploaded.id}
                    </p>

                    <p>
                        <a
                            href={uploaded.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Ouvrir le document
                        </a>
                    </p>
                </div>
            )}

        </div>
    );
});

export default FileUploader;