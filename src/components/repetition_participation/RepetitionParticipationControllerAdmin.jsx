import { useState } from "react";
import NotificationService from "../../services/NotificationService";
// import { saisonrepetitionchanteursConfig } from "../../config/entities/saisonrepetitionchanteurs.config";
import RepetitionParticipationIHM from "./RepetitionParticipationIHM";
import { saisonrepetitionchanteursConfig } from "../../config/entities/saisonrepetitionchanteur.config";



import RepetitionParticipationAdminIHM
    from "./RepetitionParticipationAdminIHM";

export default function RepetitionParticipationControllerAdmin({
    repetition,
    row,
    onParticipationChange
}) {
    const [saving, setSaving] = useState(false);

    if (!repetition || !row) {
        return null;
    }

    const saisonChanteurId = row.id;

    const [participation, setParticipation] = useState(
        row.repetition_chanteurs?.[0]?.participe ?? null
    );



    const handleParticipationChange = async (value) => {

        setSaving(true);

        try {

            const result =
                await saisonrepetitionchanteursConfig
                    .controller
                    .saveParticipation(
                        repetition.id,
                        saisonChanteurId,
                        value
                    );


            if (result?.success === false) {
                throw new Error(
                    result.message ||
                    "Erreur lors de l'enregistrement."
                );
            }


            NotificationService.success(
                "Participation enregistrée."
            );

            setParticipation(value);
            onParticipationChange?.(
                saisonChanteurId,
                value
            );


        } catch (error) {

            console.error(
                "Erreur modification participation répétition",
                error
            );

            NotificationService.error(
                "Erreur lors de l'enregistrement."
            );

        } finally {

            setSaving(false);

        }
    };


    return (
        <RepetitionParticipationAdminIHM
            participation={participation}
            saving={saving}
            onParticipationChange={
                handleParticipationChange
            }
        />
    );
}