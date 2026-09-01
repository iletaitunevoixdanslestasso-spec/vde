import { useCallback, useEffect, useState } from "react";
import { FieldRenderers } from "./FieldRenderers";
import FormEdition from "./FormEdition";
import FormRepartition from "./FormRepartition";
import "./../styles/FormModal.css";

export default function FormModal({
    open,
    action,
    config,
    context,
    initialData = null,
    errors = [],
    onClose,
    onFieldChange,
    onSave
}) {

    const [form, setForm] = useState({});
    const [fileUpload, setFileUpload] = useState(null);

    const registerFileUpload = useCallback((upload) => {
        setFileUpload(() => upload);
    }, []);

    const ModalContent = {
        edit: FormEdition,
        repartition: FormRepartition
    };

    useEffect(() => {

        if (!open) return;

        setFileUpload(null);

        if (initialData) {

            setForm(initialData);

        } else {

            const obj = {};

            config.columns.forEach(f => {

                if (f.type === "date") obj[f.field] = "";
                if (f.type === "text") obj[f.field] = "";
                if (f.type === "number") obj[f.field] = "";
                if (f.type === "select") obj[f.field] = "";
                if (f.type === "boolean") obj[f.field] = false;

            });

            setForm(obj);
        }

    }, [initialData, open, config, action]);

    const Content = ModalContent[action] || FormEdition;

    if (!open) return null;

    const handleChange = (name, value) => {

        onFieldChange(name);

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (form) => {

        console.log("form", form)
        let finalForm = { ...form };

        if (fileUpload) {

            const result = await fileUpload();
            console.log(result)

            if (result !== null) {



                if (!result.skipped) {

                    const docuemtnreferentiel = {
                        path: result.path,
                    };
                    console.log(docuemtnreferentiel)
                    finalForm = {
                        ...finalForm,
                        referentiel_documents_path: result.path,
                        [result.field]: result.path
                    };
                    console.log(finalForm)
                }
            }
        }

        onSave(finalForm);
    };

    return (
        <div className="form-modal-overlay">

            <div className="form-modal">

                <div className="form-modal-content">

                    <Content
                        config={config}
                        initialData={initialData}
                        context={context}
                        form={form}
                        errors={errors}
                        onChange={handleChange}
                        onClose={onClose}
                        onFieldChange={onFieldChange}
                        onFileUploadReady={registerFileUpload}
                        onSave={handleSave}
                    />

                </div>

                <div className="form-modal-footer">

                    <button
                        type="button"
                        className="form-modal-cancel"
                        onClick={onClose}
                    >
                        Annuler
                    </button>

                </div>

            </div>

        </div>
    );
}
