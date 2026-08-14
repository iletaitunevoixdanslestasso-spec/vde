import { useEffect, useState } from "react";
import { FieldRenderers } from "./FieldRenderers";
import FormEdition from "./FormEdition";
import FormRepartition from "./FormRepartition";

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



    const ModalContent = {
        edit: FormEdition,
        repartition: FormRepartition
    };


    // ✔ 1. hooks toujours en premier
    useEffect(() => {
        if (!open) return;

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

    const errorsByField = Object.fromEntries(
        errors.map(e => [e.field, e.message])
    );

    // ✔ 2. ensuite logique normale
    if (!open) return null;

    const fields = config.columns || [];

    const handleChange = (name, value) => {
        onFieldChange(name)
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };


    const styles = {
        overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
        },
        modal: {
            background: "white",
            padding: 20,
            width: 500,
            borderRadius: 8
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>


                <Content
                    config={config}
                    initialData={initialData}
                    context={context}
                    form={form}
                    errors={errors}
                    onChange={handleChange}
                    onClose={onClose}
                    onFieldChange={onFieldChange}
                    onSave={onSave}
                />




                <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                    <button onClick={onClose}>Annuler</button>

                </div>
            </div>
        </div>
    );
}