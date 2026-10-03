import {
    useEffect,
    useState
} from "react";

import CRUDPage from "../../../../framework/crud/CRUDPage";

import {
    repetitionConfig
} from "../../../../config/entities/repetition.config";

import {
    useSaison
} from "../../../../components/contexts/SaisonContext";

import {
    useNavigate
} from "react-router-dom";

import {
    useConcert
} from "../../../../components/contexts/ConcertContext";

import RepetitionExportService from "../../../../services/RepetitionExportService";

import ImportRepetitionsExcel from "../../../../components/ImportRepetitionsExcel";


export default function RepetitionPage() {

    const {

        saisonActive,

        saisonSelectionne,

        updateSaisonSelectionneObjet

    } = useSaison();


    const navigate =
        useNavigate();


    const {
        selectConcert
    } = useConcert();


    /*
     * Permet de recharger complètement
     * le CRUD après un import.
     */

    const [
        reloadKey,
        setReloadKey
    ] =
        useState(0);


    useEffect(() => {

        if (!saisonSelectionne) {

            navigate(
                "/admin"
            );

        }

    }, [
        saisonSelectionne,
        navigate
    ]);


    if (!saisonSelectionne) {

        return null;

    }


    /*
     * =========================================================
     * EXPORT EXCEL
     * =========================================================
     */

    const handleExportExcel =
        async () => {

            await RepetitionExportService
                .exportParticipations({

                    saisonId:
                        saisonSelectionne.id,

                    saisonNom:
                        saisonSelectionne.nom

                });

        };


    /*
     * =========================================================
     * CONTEXT CRUD
     * =========================================================
     */

    const context = {

        saisonId:
            saisonSelectionne.id,

        saisonNom:
            saisonSelectionne.nom,

        selectObjet:
            updateSaisonSelectionneObjet

    };


    /*
     * Export uniquement pour
     * la saison active.
     */

    if (
        saisonActive?.id ===
        saisonSelectionne.id
    ) {

        context.exportExcel =
            handleExportExcel;

    }


    /*
     * =========================================================
     * APRES IMPORT
     * =========================================================
     */

    const handleImported = () => {

        setReloadKey(
            value =>
                value + 1
        );

    };


    /*
     * =========================================================
     * RENDU
     * =========================================================
     */

    return (

        <div>

            <div>

                <CRUDPage

                    key={
                        reloadKey
                    }

                    config={
                        repetitionConfig
                    }

                    context={
                        context
                    }

                />

            </div>


            <div>

                <ImportRepetitionsExcel

                    saisonId={
                        saisonSelectionne.id
                    }

                    onImported={
                        handleImported
                    }

                />

            </div>

        </div>

    );

}