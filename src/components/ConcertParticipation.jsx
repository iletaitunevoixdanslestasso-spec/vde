import { useState } from "react";
import NotificationService from "../services/NotificationService";
import { saisonconcertConfig } from "../config/entities/saisonconcert.config";
import { useChanteur } from "./contexts/ChanteurContext";
import RepetitionParticipationBoutons from "./repetition_participation/RepetitionParticipationBoutons";


export default function ConcertParticipation({
    concert,
    onParticipationChange,
}) {
    const token = localStorage.getItem("token");    
    const {
        chanteur
    } = useChanteur();
    const controller =
        saisonconcertConfig.controller;

    const [saving, setSaving] = useState(false);

    if (!concert) {
        return null;
    }

    const saisonRendezvous =
        concert.saison_rendezvous?.[0]?.id;

    const handleParticipationChange = (participation) => {

        if (new Date(concert.date) < new Date()) {
            NotificationService.info(
                "Ce concert est passé, la participation ne peut pas être modifiée."
            );
            return;
        }

        if (!saisonRendezvous) {
            NotificationService.error(
                "Impossible de déterminer le rendez-vous du concert."
            );
            return;
        }

        setSaving(true);

        controller.saveParticipation(
            token,
            chanteur,
            concert.id,
            saisonRendezvous,
            participation,

            (result) => {

                NotificationService.success(
                    result.message ||
                    "Enregistrement effectué avec succès."
                );

                onParticipationChange?.(
                    concert.id,
                    participation
                );

                setSaving(false);
            },

            (err) => {

                NotificationService.error(
                    "Erreur modification participation"
                );

                console.error(
                    "Erreur modification participation",
                    err
                );

                setSaving(false);
            }
        );
    };
    return (
        <div className="concert-participation">

            <label className="concert-participation-label">
                Ma participation
            </label>

            <RepetitionParticipationBoutons
                participation={concert.participation}
                saving={saving}
                onParticipationChange={
                    handleParticipationChange
                }
            />

        </div>
    );
    return (
        <div className="concert-participation">

            <label className="concert-participation-label">
                Ma participation
            </label>

            <div className="concert-participation-buttons">

                <button
                    type="button"
                    className={`concert-participation-button ${
                        concert.participation === true
                            ? "selected"
                            : ""
                    }`}
                    disabled={saving}
                    title="Je participe"
                    onClick={() =>
                        handleParticipationChange(true)
                    }
                >
                    👍
                </button>

                <button
                    type="button"
                    className={`concert-participation-button ${
                        concert.participation === false
                            ? "selected"
                            : ""
                    }`}
                    disabled={saving}
                    title="Je ne participe pas"
                    onClick={() =>
                        handleParticipationChange(false)
                    }
                >
                    ❌
                </button>

            </div>

            {saving && (
                <span className="concert-saving">
                    Enregistrement...
                </span>
            )}

        </div>
    );
}