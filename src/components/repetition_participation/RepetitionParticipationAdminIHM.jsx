import RepetitionParticipationBoutons
    from "./RepetitionParticipationBoutons";

export default function RepetitionParticipationAdminIHM({
    participation,
    saving,
    onParticipationChange
}) {
    return (
        <RepetitionParticipationBoutons
            participation={participation}
            saving={saving}
            onParticipationChange={
                onParticipationChange
            }
        />
    );
}