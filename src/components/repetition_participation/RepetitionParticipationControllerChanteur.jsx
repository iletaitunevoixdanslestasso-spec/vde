import { useState } from "react";
import NotificationService from "../../services/NotificationService";
import { repetitionConfig } from "../../config/entities/repetition.config";
import { useChanteur } from "./../contexts/ChanteurContext";
import RepetitionParticipationIHM from "./RepetitionParticipationIHM";

export default function RepetitionParticipationControllerChanteur({
    repetition,
    onParticipationChange,
    onClose
}) {
    const { chanteur } = useChanteur();

    const token = localStorage.getItem("token");

    const [saving, setSaving] = useState(false);

    if (!repetition) {
        return null;
    }

    const saisonChanteurId =
        chanteur?.saisonChanteur?.id;

    const handleParticipationChange = async (participation) => {

        if (!saisonChanteurId) {
            NotificationService.error(
                "Impossible de déterminer le chanteur."
            );
            return;
        }

        setSaving(true);

        try {

            const { data, error } =
                await repetitionConfig.service.saveParticipation(
                    token,
                    saisonChanteurId,
                    repetition.id,
                    participation
                );

            if (error) {
                throw error;
            }

            NotificationService.success(
                "Enregistrement effectué avec succès."
            );

            onParticipationChange?.(
                repetition.id,
                participation
            );

            onClose?.();

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
        <RepetitionParticipationIHM
            repetition={repetition}
            participation={repetition.participation ?? null}
            saving={saving}
            onParticipationChange={handleParticipationChange}
        />
    );
}