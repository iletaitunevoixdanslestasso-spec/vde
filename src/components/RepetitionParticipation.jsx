import { useState } from "react";
import NotificationService from "../services/NotificationService";
import { repetitionConfig } from "../config/entities/repetition.config";
import { useChanteur } from "./contexts/ChanteurContext";


export default function RepetitionParticipation({
    repetition,
    onParticipationChange,
    onClose
}) {

    const {
        chanteur
    } = useChanteur();
    const token = localStorage.getItem("token");
    const [saving, setSaving] = useState(false);


    if (!repetition) {
        return null;
    }


    const saisonChanteurId =
        chanteur?.saisonChanteur?.id;


    const handleParticipationChange = async (
        participation
    ) => {

        if (!saisonChanteurId) {

            NotificationService.error(
                "Impossible de déterminer le chanteur."
            );

            return;
        }


        setSaving(true);


        try {

            const { data, error } =
                await repetitionConfig.service
                    .saveParticipation(
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

        <div className="repetition-participation-overlay">

            <div
                className="repetition-participation-popin"
                role="dialog"
                aria-modal="true"
                aria-labelledby="repetition-participation-title"
            >

                {/* ==========================================
                    EN-TÊTE
                   ========================================== */}

                <div className="repetition-participation-header">

                    <div className="repetition-participation-icon">
                        🎤
                    </div>

                    <div>

                        <div className="repetition-participation-eyebrow">
                            Aujourd'hui
                        </div>

                        <h2
                            id="repetition-participation-title"
                            className="repetition-participation-title"
                        >
                            Répétition
                        </h2>

                    </div>

                </div>


                {/* ==========================================
                    INFORMATIONS
                   ========================================== */}

                <div className="repetition-participation-content">

                    <p>
                        Tu as une répétition aujourd'hui.
                    </p>

                    {repetition.rendezvous?.titre && (

                        <strong>
                            {repetition.rendezvous.titre}
                        </strong>

                    )}

                    {repetition.rendezvous?.heure_rdv && (

                        <span className="repetition-participation-time">
                            🕐 Rendez-vous à{" "}
                            {repetition.rendezvous.heure_rdv}
                        </span>

                    )}

                    <p className="repetition-participation-question">
                        Participeras-tu à cette répétition ?
                    </p>

                </div>


                {/* ==========================================
                    BOUTONS
                   ========================================== */}

                <div className="repetition-participation-buttons">

                    <button
                        type="button"
                        className="repetition-participation-button"
                        disabled={saving}
                        title="Je participe"
                        aria-label="Je participe"
                        onClick={() =>
                            handleParticipationChange(true)
                        }
                    >
                        👍
                    </button>


                    <button
                        type="button"
                        className="repetition-participation-button"
                        disabled={saving}
                        title="Je ne participe pas"
                        aria-label="Je ne participe pas"
                        onClick={() =>
                            handleParticipationChange(false)
                        }
                    >
                        ❌
                    </button>


                    <button
                        type="button"
                        className="repetition-participation-button"
                        disabled={saving}
                        title="Je ne sais pas"
                        aria-label="Je ne sais pas"
                        onClick={() =>
                            handleParticipationChange(null)
                        }
                    >
                        ❓
                    </button>

                </div>


                {/* ==========================================
                    SAUVEGARDE
                   ========================================== */}

                {saving && (

                    <div className="repetition-participation-saving">
                        Enregistrement...
                    </div>

                )}

            </div>

        </div>

    );
}