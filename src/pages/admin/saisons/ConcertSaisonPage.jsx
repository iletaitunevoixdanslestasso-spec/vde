import { useEffect } from "react";
import CRUDPage from "../../../framework/crud/CRUDPage";
import { concertConfig } from "../../../config/entities/concert.config";
import { useSaison } from "../../../components/contexts/SaisonContext";
import { SaisonConcertController } from "../../../controllers/SaisonConcertController";
import { useNavigate } from "react-router-dom";
import { useConcert } from "../../../components/contexts/ConcertContext";

const presenceColumn = {
    field: "presence",
    header: "P / N / A",
    mapped: false,
    hideInForm: true,
    type: "text",

    render: (v, row) => {
        return {
            value: `${row.presents} / ${row.ne_sait_pas} / ${row.absents}`,
            cssClass: "data-table-nowrap"
        };
    },

    sortValue: (row) => {
        return row.presents ?? 0;
    },
};

export default function ConcertSaisonPage() {

    const { saisonSelectionne } = useSaison();
    const navigate = useNavigate();
    const { selectConcert } = useConcert();

    useEffect(() => {
        if (!saisonSelectionne) {
            navigate("/admin");
        }
    }, [saisonSelectionne, navigate]);

    if (!saisonSelectionne) {
        return null;
    }

    const configLocal = {
        ...concertConfig,

        columns: [
            presenceColumn,
            ...concertConfig.columns
        ],

        controller: new SaisonConcertController(
            concertConfig.service
        ),

        title: "Concerts de la saison"
    };

    return (
        <CRUDPage
            config={configLocal}
            context={{
                title: configLocal.title,
                saisonId: saisonSelectionne.id,
                saisonNom: saisonSelectionne.nom,
                selectConcert
            }}
        />
    );
}