import { useEffect, useMemo, useState } from "react";

import DataTable from "../table/DataTable";
import FormModal from "../form/FormModal";
import { useNavigate } from "react-router-dom";
import NotificationService from "../../services/NotificationService";

export default function CRUDPage({ config, context = {} }) {
    const navigate = useNavigate();



    const [items, setItems] = useState([]);
    const [title, setTitle] = useState(config.title || "CRUD Page");
    const [open, setOpen] = useState(false);
    const [action, setAction] = useState("edit");
    const [editItem, setEditItem] = useState(null);
    const [errors, setErrors] = useState([]);
    const [controller, setController] = useState(config.controller);
    const [formContext, setFormContext] = useState({});

    useEffect(() => {

        controller.initialize(context);
        setTitle(context.title ?? title);
    }, [controller, context.saisonId]);

    // LOAD
    const load = () => controller.load(setItems);

    useEffect(() => {
        load();
    }, [config.entity, context.saisonId, context.selectChanson]);
    // }, [config.entity, context.saisonId]);



    // ACTIONS TABLE
    const handleAction = async (action, row) => {
        setAction(action)

        switch (action) {

            case "edit":
                if (controller.prepareForm) {

                    console.log("2")
                    const extraContext = await controller.prepareForm();
                    console.log("3")

                    setFormContext({
                        ...context,
                        ...extraContext
                    });
                    console.log("4")
                }
                setEditItem(row);
                setOpen(true);

                break;
            case "repartition":
                setEditItem(row);
                setOpen(true);
                break;

            case "activate":
                console.log("par la")
                controller.activate(row, load);
                break;
            case "manageChanteurs":
                const urlchanteur = controller.manageChanteurs(row, load);
                console.log("url", urlchanteur)
                navigate(urlchanteur)
                break;
            case "managePupitres":
                const urlPutpitre = controller.managePupitres(row, load);
                console.log("url", urlPutpitre)
                console.log("context", context)
                console.log("controller", controller)
                context.selectChanson(row);
                navigate(urlPutpitre)
                break;

            case "delete":
                if (window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
                    controller.delete(row.id, load);
                }
                break;

            default:
                if (typeof controller[action] === "function") {
                    controller[action](row, load);
                } else {
                    console.warn("Unknown action:", action);
                }
        }
    };

    // SAVE (CREATE / UPDATE)
    const onFieldChange = (field) => {
        console.log(field)
        setErrors(prev => prev.filter(e => e.field !== field));
    };

    // SAVE (CREATE / UPDATE)
    const handleAdd = async () => {
        setAction("edit")
        console.log("1")
        if (controller.prepareForm) {

            console.log("2")
            const extraContext = await controller.prepareForm();
            console.log("3")

            setFormContext({
                ...context,
                ...extraContext
            });
            console.log("4")
        }

        console.log("5")
        setEditItem(null);
        console.log("6")
        setOpen(true);
    };
    const handleSave = async (form) => {
        console.log("handleSave controller", controller);
        console.log("handleSave form", form);
        try {
            setErrors([]);


            const result = await controller.save(form, load);
            console.log("handleSave result", result);
            if (!result.success) {

                console.log("result", result)
                if (result?.action === "reactivateChanteurSaison") {
                    if (window.confirm(
                        "Ce chanteur est déjà associé mais désactivé.\nVoulez-vous le réactiver ?"
                    )) {
                        await controller.reactivate(
                            result.chanteurId,
                            result.saisonId
                        );

                        load();
                        setOpen(false);
                        return;
                    }
                }
                NotificationService.error(
                    result.message ||
                    "L'enregistrement a échoué."
                );
                console.log("dans result en erreur", result);
                setErrors(
                    result.errors?.length
                        ? result.errors
                        : [{ message: result.message }]
                );
                return;
            }
            setOpen(false);
            NotificationService.success(
                result.message ||
                "Enregistrement effectué avec succès."
            );
            setEditItem(null);

        } catch (e) {
            console.log("handleSave error", e);
            setErrors([{ message: e.message }]);
        }
    };

    return (
        <div>

            {/* TITLE */}
            <h1>{title}</h1>

            {/* ERRORS */}
            {errors.length > 0 && (
                <div style={{ color: "red", marginBottom: 10 }}>
                    {errors.map((e, i) => (
                        <div key={i}>{e.message}</div>
                    ))}
                </div>
            )}

            {/* CREATE BUTTON */}
            <button
                style={{ marginBottom: 10 }}
                onClick={handleAdd}
            >
                ➕ Nouveau
            </button>

            {/* TABLE */}
            <DataTable
                data={items}
                config={config}
                onAction={handleAction}
            />

            {/* MODAL */}
            <FormModal
                open={open}
                action={action}
                config={config}
                context={formContext}
                errors={errors}
                initialData={editItem}
                onClose={() => setOpen(false)}
                onFieldChange={onFieldChange}
                onSave={handleSave}
            />

        </div>
    );
}