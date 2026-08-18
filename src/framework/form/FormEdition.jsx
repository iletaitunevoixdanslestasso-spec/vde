import { FieldRenderers } from "./FieldRenderers";

export default function FormEdition({
    config,
    initialData,
    context,
    form,
    errors,
    onClose,
    onSave,
    onFileUploadReady,
    onChange
}) {

    const fields = config.columns || [];

    const errorsByField = Object.fromEntries(
        errors.map(e => [e.field, e.message])
    );

    return (
        <div className="form-edition">

            <h2 className="form-edition-title">
                <span
                    className={
                        initialData
                            ? "icon-edit"
                            : "icon-new"
                    }
                >
                    {initialData
                        ? "Modifier"
                        : "Créer"
                    }
                </span>
            </h2>


            <div className="form-edition-fields">

                {fields.map((f) => {

                    const Renderer = FieldRenderers[f.type];

                    return f.hideInForm ? null : (

                        <div
                            key={f.field}
                            className="form-edition-field"
                        >

                            <label>
                                {f.header} :
                            </label>


                            {f.editType === "readonly" && initialData ? (

                                <span>
                                    {f.render
                                        ? f.render(null, initialData)
                                        : form[f.field]
                                    }
                                </span>

                            ) : (

                                Renderer && (

                                    <Renderer
                                        field={f}
                                        form={form}
                                        onChange={onChange}
                                        context={context}
                                        onFileUploadReady={
                                            onFileUploadReady
                                        }
                                    />

                                )
                            )}


                            {errorsByField[f.field] && (

                                <div className="form-field-error">
                                    {errorsByField[f.field]}
                                </div>

                            )}

                        </div>
                    );
                })}

            </div>


            <div className="form-edition-actions">

                {/* <button onClick={onClose}>
                    Annuler
                </button> */}

                <button
                    className="icon-save"
                    onClick={() => onSave(form)}
                >
                    Enregistrer
                </button>

            </div>

        </div>
    );
}