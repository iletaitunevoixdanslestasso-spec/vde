// Filtre de présentation uniquement : le CA n'est pas un groupe de la chorale.
export const FILTRE_CA = "ca";

export function filtrerChanteursTrombi(chanteurs, groupeId) {
    if (groupeId === "tous") return chanteurs;
    if (groupeId === FILTRE_CA) {
        return chanteurs.filter(chanteur => chanteur.fonction_ca_id != null);
    }
    return chanteurs.filter(chanteur => chanteur.groupe_id === groupeId);
}
