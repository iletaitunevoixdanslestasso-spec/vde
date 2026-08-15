import { useEffect, useState } from "react";
import FormEdition from "../form/FormEdition";
import NotificationService from "../../services/NotificationService";


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

            const result =
                await controller.saveItemByToken(form);

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
             * Notification de succès
             */
            NotificationService.success(
                result.message ||
                "Enregistrement effectué avec succès."
            );

            /*
             * Rechargement du profil
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
            <div>

                <h1>
                    {config.title}
                </h1>

                <p>
                    Chargement...
                </p>

            </div>
        );
    }


    /*
     * FORMULAIRE DIRECTEMENT DANS LA PAGE
     */

    return (
        <div>

            <h1>
                {config.title}
            </h1>

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
                saving={saving}
            />

        </div>
    );
}