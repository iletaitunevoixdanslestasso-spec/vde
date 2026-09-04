import { useEffect, useState } from "react";

import DataTable from "../table/DataTable";
import FormModal from "../form/FormModal";
import { useNavigate } from "react-router-dom";
import NotificationService from "../../services/NotificationService";
import "./../styles/CRUDPage.css";
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


    // INITIALISATION
    useEffect(() => {

        controller.initialize(context);
        setTitle(context.title ?? title);

    }, [controller, context.saisonId]);


    // LOAD
    const load = () => controller.load(setItems);

    useEffect(() => {

        load();

    }, [
        config.entity,
        context.saisonId,
        context.selectChanson,
        context.selectConcert
    ]);


    // ACTIONS TABLE
    const handleAction = async (action, row) => {

        setAction(action);

        switch (action) {

            case "edit":

                if (controller.prepareForm) {

                    const extraContext =
                        await controller.prepareForm();

                    setFormContext({
                        ...context,
                        ...extraContext
                    });
                }
                // setEditItem(row);
                //ajout d'un attribut par defaut 
                const formItem = {
                    ...row,
                    lieu_mode: row.lieu_id ? "existant" : "nouveau"
                };
                setEditItem(formItem);
                setOpen(true);

                break;


            case "repartition":
                console.log("repartition", row)
                setEditItem(row);
                setOpen(true);

                break;


            case "activate":

                controller.activate(row, load);

                break;


            case "manageChanteurs": {

                const urlchanteur =
                    controller.manageChanteurs(row, load);

                navigate(urlchanteur);

                break;
            }


            case "managePupitres": {
                console.log(row)
                const urlPutpitre =
                    controller.managePupitres(row, load);
                console.log(urlPutpitre)
                context.selectChanson(row);

                navigate(urlPutpitre);

                break;
            }
            case "manageSaisonChansonPupitres": {
                console.log(row)
                const urlPutpitre =
                    controller.managePupitres(row, load);
                console.log(urlPutpitre)
                context.selectChanson(row.chansons);

                navigate(urlPutpitre);

                break;
            }

            case "manageSaisonConcertChanson": {
                console.log(row)

                const urlConcertChanson =
                    controller.manageSaisonConcertChanson(row, load);
                console.log(urlConcertChanson)
                context.selectConcert(row);
                navigate(urlConcertChanson);

                break;
            }
            case "manageSaisonRepetitionChanteur": {
                console.log(row)

                const urlConcertChanson =
                    controller.manageSaisonRepetitionChanteur(row, load);
                console.log(urlConcertChanson)
                context.selectObjet(row);
                navigate(urlConcertChanson);

                break;
            }


            case "delete":

                if (
                    window.confirm(
                        "Êtes-vous sûr de vouloir supprimer cet élément ?"
                    )
                ) {
                    controller.delete(row.id, load);
                }

                break;


            default:

                if (
                    typeof controller[action] === "function"
                ) {
                    controller[action](row, load);
                } else {
                    console.warn(
                        "Unknown action:",
                        action
                    );
                }

        }
    };


    // FIELD CHANGE
    const onFieldChange = (field) => {

        setErrors(prev =>
            prev.filter(e => e.field !== field)
        );

    };


    // CREATE
    const handleAdd = async () => {

        setAction("edit");

        if (controller.prepareForm) {

            const extraContext =
                await controller.prepareForm();

            setFormContext({
                ...context,
                ...extraContext
            });
        }

        setEditItem(null);
        setOpen(true);
    };


    // SAVE
    const handleSave = async (form) => {

        try {

            setErrors([]);

            const result =
                await controller.save(form, load);


            if (!result.success) {

                if (
                    result?.action ===
                    "reactivateChanteurSaison"
                ) {

                    if (
                        window.confirm(
                            "Ce chanteur est déjà associé mais désactivé.\n" +
                            "Voulez-vous le réactiver ?"
                        )
                    ) {

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

            console.log(
                "handleSave error",
                e
            );

            setErrors([
                {
                    message: e.message
                }
            ]);
        }
    };
    const handleReorder = async (rows) => {
        await controller.updateOrdres(rows);

        await load();
    };

    return (
        <div>

            {/* TITLE */}

            <h1>
                {title}
            </h1>


            {/* ERRORS */}

            {errors.length > 0 && (

                <div className="crud-errors">

                    {errors.map((e, i) => (
                        <div key={i}>
                            {e.message}
                        </div>
                    ))}

                </div>
            )}


            {/* CREATE BUTTON */}

            <button
                className="icon-new crud-new-button"
                onClick={handleAdd}
            >
                Nouveau
            </button>


            {/* TABLE */}

            <DataTable
                data={items}
                config={config}
                context={context}
                onAction={handleAction}
                onReorder={handleReorder}
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