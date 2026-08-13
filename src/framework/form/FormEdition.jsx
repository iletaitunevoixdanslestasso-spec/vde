import { FieldRenderers } from "./FieldRenderers";

export default function FormEdition({
    config,
    initialData,
    context,
    form,
    errors,
    onClose,
    onSave,
    onChange
}) {
    const fields = config.columns || [];

    const errorsByField = Object.fromEntries(
        errors.map(e => [e.field, e.message])
    );

    return (
        <div>


            <h2>{initialData ? "✏️ Modifier" : "➕ Créer"}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {fields.map((f) => {

                    const Renderer = FieldRenderers[f.type];

                    return f.hideInForm ? null : (
                        <div key={f.field}>

                            <label>{f.header}</label>

                            {Renderer && (
                                <Renderer
                                    field={f}
                                    form={form}
                                    onChange={onChange}
                                    context={context}
                                />
                            )}

                            {errorsByField[f.field] && (
                                <div style={{
                                    color: "#dc3545",
                                    fontSize: 12,
                                    marginTop: 4
                                }}>
                                    {errorsByField[f.field]}
                                </div>
                            )}

                        </div>
                    );
                })}

            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button onClick={onClose}>Annuler</button>

                <button onClick={() => onSave(form)}>
                    Enregistrer
                </button>
            </div>
        </div>
    );
}