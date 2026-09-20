import "./RepetitionParticipationBoutons.css";

export default function RepetitionParticipationBoutons({
    participation,
    saving,
    disabled = false,
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
                disabled={saving || disabled}
                title="Je participe"
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
                disabled={saving || disabled}
                title="Je ne participe pas"
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
                disabled={saving || disabled}
                title="Je ne sais pas"
                onClick={() =>
                    onParticipationChange(null)
                }
            >
                ❓
            </button>

        </div>
    );
}