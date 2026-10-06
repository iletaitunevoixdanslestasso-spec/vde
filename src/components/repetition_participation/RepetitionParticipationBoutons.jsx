import { Check, CircleHelp, X } from "lucide-react";
import "./RepetitionParticipationBoutons.css";

export default function RepetitionParticipationBoutons({
    participation,
    saving,
    disabled = false,
    onParticipationChange
}) {
    const isDisabled = saving || disabled;

    return (
        <div
            className="participation-buttons"
            role="group"
            aria-label="Participation à la répétition"
        >
            <button
                type="button"
                className={`participation-button participation-button--yes ${
                    participation === true ? "selected" : ""
                }`}
                disabled={isDisabled}
                title="Je participe"
                aria-label="Je participe"
                aria-pressed={participation === true}
                onClick={() => onParticipationChange(true)}
            >
                <Check size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>

            <button
                type="button"
                className={`participation-button participation-button--no ${
                    participation === false ? "selected" : ""
                }`}
                disabled={isDisabled}
                title="Je ne participe pas"
                aria-label="Je ne participe pas"
                aria-pressed={participation === false}
                onClick={() => onParticipationChange(false)}
            >
                <X size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>

            <button
                type="button"
                className={`participation-button participation-button--maybe ${
                    participation === null ? "selected" : ""
                }`}
                disabled={isDisabled}
                title="Je ne sais pas"
                aria-label="Je ne sais pas"
                aria-pressed={participation === null}
                onClick={() => onParticipationChange(null)}
            >
                <CircleHelp size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
        </div>
    );
}
