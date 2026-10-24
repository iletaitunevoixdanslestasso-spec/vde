import { useSaison } from "../../components/contexts/SaisonContext";
import TrombiSaison from "../../components/trombinoscope/TrombiSaison";

export default function TrombiAdmin() {
    const { saisonSelectionne } = useSaison();
    const saisonId = saisonSelectionne?.id ?? null;

    if (!saisonId) {
        return <div>Aucune saison sélectionnée.</div>;
    }

    return <TrombiSaison key={saisonId} saisonId={saisonId} />;
}
