import { useState } from "react";
import "./SaisonChansonLeads.css";

export default function SaisonChansonLeads({
    leads = [],
    saisonChansonId,
    onToggleLead
}) {
    const [pendingIds, setPendingIds] = useState([]);

    // Les leads supprimés logiquement restent visibles (case décochée).
    const affichables = [...leads]
        .filter(lead => lead.saison_chanteurs?.chanteurs)
        .sort((a, b) => {
            const actifA = a.deleted_at == null ? 0 : 1;
            const actifB = b.deleted_at == null ? 0 : 1;
            if (actifA !== actifB) return actifA - actifB;

            const chanteurA = a.saison_chanteurs.chanteurs;
            const chanteurB = b.saison_chanteurs.chanteurs;
            const nomA = [chanteurA.nom, chanteurA.prenom].filter(Boolean).join(" ");
            const nomB = [chanteurB.nom, chanteurB.prenom].filter(Boolean).join(" ");
            return nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        });

    const handleChange = async (lead, checked) => {
        setPendingIds(current => [...current, lead.id]);
        try {
            await onToggleLead(lead.id, saisonChansonId, checked);
        } catch (error) {
            console.error("Modification du lead impossible", error);
        } finally {
            setPendingIds(current => current.filter(id => id !== lead.id));
        }
    };

    if (affichables.length === 0) return <span>—</span>;

    return (
        <div className="saison-chanson-leads">
            {affichables.map(lead => {
                const chanteur = lead.saison_chanteurs.chanteurs;
                const nomComplet = [chanteur.nom, chanteur.prenom]
                    .filter(Boolean)
                    .join(" ");

                return (
                    <label key={lead.id} className="saison-chanson-lead">
                        <input
                            type="checkbox"
                            checked={lead.deleted_at == null}
                            disabled={
                                pendingIds.includes(lead.id) ||
                                typeof onToggleLead !== "function"
                            }
                            onChange={event =>
                                handleChange(lead, event.target.checked)
                            }
                        />
                        <span>{nomComplet}</span>
                    </label>
                );
            })}
        </div>
    );
}
