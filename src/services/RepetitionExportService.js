import { supabase } from "../core/supabase/client";
import { RepetitionRepository } from "../repositories/RepetitionRepository";
import ExcelService from "./ExcelService";


function formatDate(date) {

    if (!date) {
        return "";
    }

    return new Date(date).toLocaleDateString(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


class RepetitionExportService {

    static async exportParticipations({
        saisonId,
        saisonNom
    }) {

        /*
         * =====================================================
         * 1. RECUPERATION DES PARTICIPATIONS
         * =====================================================
         */
        const repository =
            new RepetitionRepository();

        const { data, error } =
            await repository.findParticipationsSaison(
                saisonId
            );


        if (error) {

            console.error(
                "Erreur export participations répétitions",
                error
            );

            throw error;
        }


        /*
         * =====================================================
         * 2. LISTE DES REPETITIONS
         * =====================================================
         *
         * On travaille avec repetition_id et pas uniquement
         * avec la date car deux répétitions pourraient avoir
         * la même date.
         */

        const repetitionsMap = new Map();


        data.forEach(row => {

            if (!repetitionsMap.has(row.repetition_id)) {

                repetitionsMap.set(
                    row.repetition_id,
                    {
                        id: row.repetition_id,
                        date: row.repetition_date
                    }
                );
            }

        });


        const repetitions =
            Array.from(repetitionsMap.values())
                .sort(
                    (a, b) =>
                        new Date(a.date) -
                        new Date(b.date)
                );


        /*
         * =====================================================
         * 3. REGROUPEMENT PAR CHORISTE
         * =====================================================
         */

        const chanteursMap = new Map();


        data.forEach(row => {

            if (!chanteursMap.has(row.saison_chanteur_id)) {

                chanteursMap.set(
                    row.saison_chanteur_id,
                    {
                        choriste: [
                            row.chanteur_nom,
                            row.chanteur_prenom
                        ]
                            .filter(Boolean)
                            .join(" "),
                        groupe:row.groupe_nom,
                        participations: {}
                    }
                );
            }


            const chanteur =
                chanteursMap.get(
                    row.saison_chanteur_id
                );


            chanteur.participations[
                row.repetition_id
            ] = row.participe;

        });


        /*
         * =====================================================
         * 4. CREATION DES COLONNES EXCEL
         * =====================================================
         */

        const columns = [

            {
                field: "choriste",
                header: "Choriste",
                type: "text"
            },
            {
                field: "groupe",
                header: "Groupe",
                type: "text"
            },

            ...repetitions.map(repetition => ({

                field:
                    `repetition_${repetition.id}`,

                header:
                    formatDate(repetition.date),

                type: "text"

            }))
        ];


        /*
         * =====================================================
         * 5. CREATION DES LIGNES EXCEL
         * =====================================================
         */

        const rows =
            Array.from(chanteursMap.values())
                .map(chanteur => {

                    const row = {
                        choriste:
                            chanteur.choriste,
                        groupe:
                            chanteur.groupe
                    };


                    repetitions.forEach(
                        repetition => {

                            row[
                                `repetition_${repetition.id}`
                            ] =
                                chanteur.participations[
                                    repetition.id
                                ] === true
                                    ? "X"
                                    : "";

                        }
                    );


                    return row;
                });


        /*
         * =====================================================
         * 6. EXPORT
         * =====================================================
         */

        ExcelService.exportToExcel(
            rows,
            {
                columns,

                fileName:
                    `participations_repetitions_${saisonNom}`,

                sheetName:
                    "Participations"
            }
        );
    }
}


export default RepetitionExportService;