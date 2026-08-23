import { useCallback, useEffect, useState } from "react";
import FormEdition from "../form/Formedition";
import NotificationService from "../../services/NotificationService";
import "../../styles/espaceChanteur_cruditem.css";

export default function CRUDItemPage({
    config,
    context = {}
}) {

    const [item, setItem] = useState(null);
    const [errors, setErrors] = useState([]);
    const [formContext, setFormContext] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});
    const controller = config.controller;
    const [fileUpload, setFileUpload] = useState(null);


    const registerFileUpload = useCallback((upload) => {
        setFileUpload(() => upload);
    }, []);


    /*
     * INITIALISATION
     */
    useEffect(() => {

        const initialize = async () => {

            controller.initialize(context);

            let extraContext = {};

            if (controller.prepareForm) {
                extraContext =
                    await controller.prepareForm();
            }

            setFormContext({
                ...context,
                ...extraContext
            });
        };

        initialize();

    }, [controller, context]);


    /*
     * LOAD
     */
    const load = async () => {

        setLoading(true);
        setErrors([]);

        try {

            const result =
                await controller.loadItemByToken();

            if (!result.success) {

                setErrors(
                    result.errors?.length
                        ? result.errors
                        : [
                            {
                                message: result.message
                            }
                        ]
                );

                return;
            }

            const item = result.data[0];

            setItem(item);
            setForm(item);

        } catch (e) {

            console.error(
                "CRUDItemPage load error",
                e
            );

            setErrors([
                {
                    message: e.message
                }
            ]);

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {
        load();
    }, [
        config.entity,
        context.token,
        context.id
    ]);


    /*
     * FIELD CHANGE
     */
    const onFieldChange = (field) => {

        setErrors(prev =>
            prev.filter(
                error => error.field !== field
            )
        );

    };


    /*
     * SAVE
     */
    const handleSave = async (form) => {

        setSaving(true);
        setErrors([]);

        try {

            let finalForm = { ...form };

            /*
             * Le document déjà enregistré ne doit pas
             * être envoyé comme un nouveau document.
             */
            delete finalForm.droit_image;


            /*
             * UPLOAD FICHIER
             */
            if (fileUpload) {

                const result = await fileUpload();

                if (result && !result.skipped) {

                    finalForm = {
                        ...finalForm,
                        [result.field]: result.path
                    };
                }
            }


            /*
             * SAUVEGARDE
             */
            const result =
                await controller.saveItemByToken(finalForm);


            if (!result.success) {

                setErrors(
                    result.errors?.length
                        ? result.errors
                        : [
                            {
                                message:
                                    result.message
                            }
                        ]
                );

                NotificationService.error(
                    result.message ||
                    "L'enregistrement a échoué."
                );

                return;
            }


            /*
             * NOTIFICATION DE SUCCÈS
             */
            NotificationService.success(
                result.message ||
                "Enregistrement effectué avec succès."
            );


            /*
             * RECHARGEMENT DU PROFIL
             */
            await load();

        } catch (e) {

            console.error(
                "CRUDItemPage save error",
                e
            );

            setErrors([
                {
                    message: e.message
                }
            ]);

            NotificationService.error(
                e.message ||
                "Une erreur est survenue."
            );

        } finally {

            setSaving(false);

        }
    };


    /*
     * LOADING
     */
    if (loading) {

        return (
            <div className="crud-item-page">

                <div className="crud-item-loading">

                    <div className="crud-item-header">

                        <div className="crud-item-header-icon">
                            ✏️
                        </div>

                        <div className="crud-item-header-content">

                            <div className="crud-item-eyebrow">
                                Espace chanteur
                            </div>

                            <h1 className="crud-item-title">
                                {config.title}
                            </h1>

                            <p className="crud-item-subtitle">
                                Chargement de vos informations...
                            </p>

                        </div>

                    </div>

                    <div className="crud-loading">
                        Chargement...
                    </div>

                </div>

            </div>
        );
    }


    /*
     * FORMULAIRE
     */
    return (
        <div className="crud-item-page">

            {/* =====================================================
                EN-TÊTE
                ===================================================== */}

            <header className="crud-item-header">

                <div className="crud-item-header-icon">
                    ✏️
                </div>

                <div className="crud-item-header-content">

                    <div className="crud-item-eyebrow">
                        Espace chanteur
                    </div>

                    <h1 className="crud-item-title">
                        {config.title}
                    </h1>

                    <p className="crud-item-subtitle">
                        Consultez et mettez à jour vos informations.
                    </p>

                </div>

            </header>


            {/* =====================================================
                FORMULAIRE
                ===================================================== */}

            <section className="crud-item-form">

                <FormEdition
                    config={config}
                    initialData={item}
                    context={formContext}
                    form={form}
                    errors={errors}
                    onClose={null}
                    onSave={handleSave}
                    onChange={(field, value) => {

                        setForm(prev => ({
                            ...prev,
                            [field]: value
                        }));

                        onFieldChange(field);

                    }}
                    onFileUploadReady={registerFileUpload}
                    saving={saving}
                />

            </section>

        </div>
    );
}