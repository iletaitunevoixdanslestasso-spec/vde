import { useState } from "react";
import StorageService from "../../services/StorageService";


export default function TestStorage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0] ?? null;

        setFile(selectedFile);
        setResult(null);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Sélectionne un fichier PDF.");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const path = `test/${file.name}`;

            const uploadResult = await StorageService.upload(
                "referentiel-documents",
                path,
                file
            );

            console.log("UPLOAD OK", uploadResult);

            const signedUrl =
                await StorageService.createSignedUrl(
                    "referentiel-documents",
                    uploadResult.path,
                    3600
                );

            console.log("URL SIGNED OK", signedUrl);

            setResult({
                upload: uploadResult,
                url: signedUrl,
            });

        } catch (error) {
            console.error("STORAGE ERROR", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Test Storage</h2>

            <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
            />

            {file && (
                <p>
                    Fichier sélectionné :{" "}
                    <strong>{file.name}</strong>
                </p>
            )}

            <button
                type="button"
                onClick={handleUpload}
                disabled={!file || loading}
            >
                {loading ? "Upload..." : "Uploader"}
            </button>

            {error && (
                <p style={{ color: "red" }}>
                    {error}
                </p>
            )}

            {result?.url && (
                <p>
                    <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ouvrir le PDF
                    </a>
                </p>
            )}
        </div>
    );
}