import { FieldRenderers } from "./FieldRenderers";
import "../../styles/formedition.css";

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

            {/* =====================================================
                EN-TÊTE DU FORMULAIRE
                ===================================================== */}

            <div className="form-edition-header">

                <div className="form-edition-header-icon">
                    {initialData ? "✏️" : "➕"}
                </div>

                <div className="form-edition-header-content">

                    <h2 className="form-edition-title">
                        {initialData
                            ? "Modifier"
                            : "Créer"
                        }
                    </h2>

                    <p className="form-edition-subtitle">
                        {initialData
                            ? "Modifiez les informations ci-dessous."
                            : "Renseignez les informations ci-dessous."
                        }
                    </p>

                </div>

            </div>


            {/* =====================================================
                CHAMPS
                ===================================================== */}

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

                                <div className="form-edition-readonly">
                                    {f.render
                                        ? f.render(null, initialData)
                                        : form[f.field]
                                    }
                                </div>

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


            {/* =====================================================
                ACTIONS
                ===================================================== */}

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