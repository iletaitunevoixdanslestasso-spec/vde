import { useEffect, useState } from "react";

import DataTable from "../table/DataTable";
import FormModal from "../form/FormModal";
import { useNavigate } from "react-router-dom";
import NotificationService from "../../services/NotificationService";
import "./../styles/CRUDPage.css";
import { useSaison } from "../../components/contexts/SaisonContext";
import ExcelService from "../../services/ExcelService";
import { truncateText } from "../../helper/helper";
export default function CRUDPage({ config, context = {} }) {

    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [count, setCount] = useState(null);
    const [title, setTitle] = useState(config.title || "CRUD Page");
    const [open, setOpen] = useState(false);
    const [action, setAction] = useState("edit");
    const [editItem, setEditItem] = useState(null);
    const [errors, setErrors] = useState([]);
    const [controller, setController] = useState(config.controller);
    const [formContext, setFormContext] = useState({});
    const { saisonSelectionne } = useSaison();

    // INITIALISATION
    useEffect(() => {

        controller.initialize(context);
        setTitle(context.title ?? title);

    }, [controller, context.saisonId]);


    // LOAD
    const load = () =>
        controller.load((data) => {
            setItems(data);
            setCount(data?.length ?? 0);
        });

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
                        await controller.prepareForm(row);

                    setFormContext({
                        ...context,
                        ...extraContext
                    });
                }
                // setEditItem(row);
                //ajout d'un attribut par defaut 
                const formItem =
                    typeof controller.prepareEditItem === "function"
                        ? await controller.prepareEditItem(row)
                        : { ...row };

                setEditItem(formItem);
                setOpen(true);

                break;


            case "repartition":
                console.error("repartition", row)
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
                console.error(row)
                const urlPutpitre =
                    controller.managePupitres(row, load);
                console.error(urlPutpitre)
                context.selectChanson(row);

                navigate(urlPutpitre);

                break;
            }
            case "manageSaisonChansonPupitres": {
                console.error(row)
                const urlPutpitre =
                    controller.managePupitres(row, load);
                console.error(urlPutpitre)
                context.selectChanson(row.chansons);

                navigate(urlPutpitre);

                break;
            }

            case "manageSaisonConcertChanson": {
                console.error(row)

                const urlConcertChanson =
                    controller.manageSaisonConcertChanson(row, load);
                console.error(urlConcertChanson)
                context.selectConcert(row);
                navigate(urlConcertChanson);

                break;
            }
            case "manageSaisonRepetitionChanteur": {

                const urlConcertChanson =
                    controller.manageSaisonRepetitionChanteur(row, load);
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

    const handleParticipationChange = (saisonChanteurId, value) => {
        setItems(currentItems =>
            currentItems.map(item => {
                if (item.id !== saisonChanteurId) {
                    return item;
                }

                const participations = item.repetition_chanteurs ?? [];

                return {
                    ...item,
                    repetition_chanteurs: participations.length > 0
                        ? participations.map((participation, index) =>
                            index === 0
                                ? { ...participation, participe: value }
                                : participation
                        )
                        : [{ participe: value }]
                };
            })
        );
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
                await controller.prepareForm(null);

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

            console.error(
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

    // export excel
    const handleExportExcel = () => {

        const excelContext =
            typeof context.exportExcel === "object"
                ? context.exportExcel
                : {};


        const excelConfig = {
            columns:
                excelContext.columns ??
                config.excel?.columns ??
                config.columns,

            fileName:
                excelContext.fileName ??
                config.excel?.fileName ??
                config.entity ??
                "export",

            sheetName:
                excelContext.sheetName ??
                config.excel?.sheetName ??
                "Export"
        };


        ExcelService.exportToExcel(
            items,
            excelConfig
        );
    };

    return (
        <div>



            <div className="crud-page-header">

                <h1>
                    <span className={`icon-${config?.icon} crud-page-title-icon`} alt="{title}" title="{title}">
                        <span className="crud-page-title-text">

                            {truncateText(title)}

                            {context.saisonId && (
                                <>
                                    {` ${saisonSelectionne.nom}`}

                                    <label
                                        className={
                                            saisonSelectionne.active
                                                ? "icon-saisonactive"
                                                : "icon-saison"
                                        }
                                    />
                                </>
                            )}
                        </span>
                    </span>
                </h1>

                {count !== null && (
                    <div className="crud-page-count">

                        <strong>
                            {count}
                        </strong>

                        <span>
                            {count > 1
                                ? config.countLabel?.plural ?? "éléments"
                                : config.countLabel?.singular ?? "élément"}
                        </span>

                    </div>
                )}

            </div>


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

            <div className="crud-page-actions">

                {context.nouveau !== false && (
                    <button
                        className="icon-new crud-action-button"
                        onClick={handleAdd}
                    >
                        <span>Nouveau</span>
                    </button>
                )}

                {context.exportExcel && (
                    <button
                        className="icon-excel crud-action-button crud-export-button"
                        onClick={handleExportExcel}
                        disabled={items.length === 0}
                    >
                        <span>Export Excel</span>
                    </button>
                )}

            </div>
            {/* TABLE */}

            <DataTable
                data={items}
                config={config}
                context={{
                    ...context,
                    onParticipationChange: handleParticipationChange
                }}
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