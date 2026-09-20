import { useState } from "react";
import NotificationService from "../../services/NotificationService";
import { repetitionConfig } from "../../config/entities/repetition.config";
import { useChanteur } from "./../contexts/ChanteurContext";
import RepetitionParticipationIHM from "./RepetitionParticipationIHM";
import RepetitionParticipationBoutons from "./RepetitionParticipationBoutons";

export default function RepetitionParticipationControllerChanteur({
    repetition,
    onParticipationChange,
    inline = false,
    disabled = false,
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
        if (disabled) {
            return;
        }
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


    if (inline) {

        return (
            <div className="concert-participation">

                <label className="concert-participation-label">
                    Ma participation
                </label>

                <RepetitionParticipationBoutons
                    participation={
                        repetition.participation ?? null
                    }
                    saving={saving}
                    disabled={disabled}
                    onParticipationChange={
                        handleParticipationChange
                    }
                />

                {disabled && (
                    <small>
                        Répétition passée
                    </small>
                )}

            </div>
        );
    }


    return (
        <RepetitionParticipationIHM
            repetition={repetition}
            participation={
                repetition.participation ?? null
            }
            saving={saving}
            onParticipationChange={
                handleParticipationChange
            }
        />
    );


}