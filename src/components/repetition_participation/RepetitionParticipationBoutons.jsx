import "./RepetitionParticipationBoutons.css";

export default function RepetitionParticipationBoutons({
    participation,
    saving,
    onParticipationChange
}) {
    return (
        <div className="participation-buttons">

            <button
                type="button"
                className={`participation-button ${
                    participation === true
                        ? "selected"
                        : ""
                }`}
                disabled={saving}
                title="Je participe"
                aria-label="Je participe"
                onClick={() =>
                    onParticipationChange(true)
                }
            >
                👍
            </button>

            <button
                type="button"
                className={`participation-button ${
                    participation === false
                        ? "selected"
                        : ""
                }`}
                disabled={saving}
                title="Je ne participe pas"
                aria-label="Je ne participe pas"
                onClick={() =>
                    onParticipationChange(false)
                }
            >
                ❌
            </button>

            <button
                type="button"
                className={`participation-button ${
                    participation === null
                        ? "selected"
                        : ""
                }`}
                disabled={saving}
                title="Je ne sais pas"
                aria-label="Je ne sais pas"
                onClick={() =>
                    onParticipationChange(null)
                }
            >
                ❓
            </button>

        </div>
    );
}