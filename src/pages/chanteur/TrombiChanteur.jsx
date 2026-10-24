import { useChanteur } from "../../components/contexts/ChanteurContext";
import TrombiSaison from "../../components/trombinoscope/TrombiSaison";

export default function TrombiChanteur() {
    const { chanteur, loadingChanteur } = useChanteur();

    if (loadingChanteur) {
        return <div>Chargement du trombinoscope…</div>;
    }

    const saisonId =
        chanteur?.saisonChanteur?.saison_id ??
        chanteur?.saisonId ??
        chanteur?.saison_id;

    if (!saisonId) {
        return <div>Aucune saison associée à ce chanteur.</div>;
    }

    return <TrombiSaison key={saisonId} saisonId={saisonId} />;
}
