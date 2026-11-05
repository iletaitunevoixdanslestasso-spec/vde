// Filtre de présentation uniquement : le CA n'est pas un groupe de la chorale.
export const FILTRE_CA = "ca";

const collator = new Intl.Collator("fr", {
    sensitivity: "base",
    ignorePunctuation: true
});

function comparerMembresCa(a, b) {
    const ordreA = Number.isFinite(a.fonction_ca_ordre) ? a.fonction_ca_ordre : Infinity;
    const ordreB = Number.isFinite(b.fonction_ca_ordre) ? b.fonction_ca_ordre : Infinity;
    return ordreA - ordreB ||
        collator.compare(a.nom || "", b.nom || "") ||
        collator.compare(a.prenom || "", b.prenom || "");
}

export function filtrerChanteursTrombi(chanteurs, groupeId) {
    if (groupeId === "tous") return chanteurs;
    if (groupeId === FILTRE_CA) {
        return chanteurs
            .filter(chanteur => chanteur.fonction_ca_id != null)
            .sort(comparerMembresCa);
    }
    return chanteurs.filter(chanteur => chanteur.groupe_id === groupeId);
}
