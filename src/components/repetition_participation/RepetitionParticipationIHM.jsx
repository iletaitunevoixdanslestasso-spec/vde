import RepetitionParticipationBoutons
    from "./RepetitionParticipationBoutons";

export default function RepetitionParticipationIHM({
    repetition,
    participation,
    saving,
    onParticipationChange
}) {
    if (!repetition) {
        return null;
    }

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

                <RepetitionParticipationBoutons
                    participation={participation}
                    saving={saving}
                    onParticipationChange={
                        onParticipationChange
                    }
                />


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