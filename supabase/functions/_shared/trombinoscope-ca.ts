import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

interface FonctionCa {
    fonction_ca_id: string;
    fonction: string;
}

// À appeler uniquement après vérification de l'accès à la saison.
// La vue exclut déjà les saisons, choristes et affectations supprimés.
export async function chargerFonctionsCa(db: SupabaseClient, saisonId: string) {
    const { data, error } = await db.from("ca_saison")
        .select("chanteur_id, fonction_ca_id, fonction")
        .eq("saison_id", saisonId);
    if (error) throw error;

    return new Map<string, FonctionCa>((data || []).map(row => [
        row.chanteur_id,
        { fonction_ca_id: row.fonction_ca_id, fonction: row.fonction }
    ]));
}

// Enrichir la liste autorisée ne doit jamais y ajouter les autres membres du CA.
export function ajouterFonctionCa(
    personne: Record<string, unknown>,
    fonctions: Map<string, FonctionCa>
) {
    const fonction = typeof personne.id === "string" ? fonctions.get(personne.id) : null;
    return {
        ...personne,
        fonction_ca_id: fonction?.fonction_ca_id ?? null,
        fonction_ca: fonction?.fonction ?? null
    };
}
