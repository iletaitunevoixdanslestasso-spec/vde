export default function FileRenderer({
    field,
    file,
    onChange,
    disabled = false,
    accept,
    error,
}) {
    return (
        <div>
            <input
                type="file"
                id={field}
                name={field}
                accept={accept}
                disabled={disabled}
                onChange={(event) => {
                    const selectedFile =
                        event.target.files?.[0] ?? null;

                    onChange?.(selectedFile);
                }}
            />

            {file && (
                <div>
                    Fichier sélectionné :{" "}
                    <strong>{file.name}</strong>
                </div>
            )}

            {error && (
                <div style={{ color: "red" }}>
                    {error}
                </div>
            )}
        </div>
    );
}