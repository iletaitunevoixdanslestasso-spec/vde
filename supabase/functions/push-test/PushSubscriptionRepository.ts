import { createClient } from "npm:@supabase/supabase-js@2";

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  chanteur_id?: string;
}

export class PushSelectionError extends Error {
  status: 400 | 409 | 413;
  constructor(message: string, status: 400 | 409 | 413 = 400) {
    super(message);
    this.name = "PushSelectionError";
    this.status = status;
  }
}

export interface PushSelection {
  saison_id: string;
  nombre_chanteurs: number;
  nombre_appareils: number;
  nombre_sans_abonnement: number;
  subscriptions: PushSubscriptionRow[];
}

export class PushSubscriptionRepository {
  private supabase;

  constructor() {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      throw new Error("Configuration Supabase manquante.");
    }

    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // Envoi individuel : comportement déjà validé.
  async findById(id: string): Promise<PushSubscriptionRow | null> {
    const { data, error } = await this.supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Prévisualisation sans lire les clés des appareils.
  async countAll(): Promise<number> {
    const { count, error } = await this.supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true });

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Vérifie l'éligibilité à chaque appel, simulation ET envoi. Le client ne
   * décide ni de la saison active ni des inscriptions encore valables.
   */
  async prepareSelection(
    saisonId: string,
    chanteurIds: string[],
    includeKeys: boolean,
    maxRecipients = 200,
  ): Promise<PushSelection> {
    const { data: saisons, error: saisonError } = await this.supabase
      .from("saisons")
      .select("id")
      .eq("active", true)
      .is("deleted_at", null)
      .limit(2);
    if (saisonError) throw saisonError;
    if (saisons?.length !== 1 || saisons[0].id !== saisonId) {
      throw new PushSelectionError(
        "La saison active a changé ou n'est pas unique. Rechargez la sélection.", 409,
      );
    }

    const ids = [...new Set(chanteurIds)];
    const inscrits = new Set<string>();
    // Lots courts pour limiter la taille des URL PostgREST. Les pages évitent
    // de considérer une réponse tronquée à 1 000 lignes comme exhaustive.
    for (let i = 0; i < ids.length; i += 100) {
      const lot = ids.slice(i, i + 100);
      let offset = 0;
      while (true) {
        const { data, count, error } = await this.supabase
          .from("saison_chanteurs")
          .select("chanteur_id,chanteurs!inner(id)", { count: "exact" })
          .eq("saison_id", saisonId)
          .in("chanteur_id", lot)
          .is("deleted_at", null)
          .is("chanteurs.deleted_at", null)
          .order("id", { ascending: true })
          .range(offset, offset + 99);
        if (error) throw error;
        if (count === null) throw new Error("Comptage des inscriptions indisponible.");
        for (const row of data ?? []) inscrits.add(row.chanteur_id);
        offset += data?.length ?? 0;
        if (offset >= count) break;
        if (!data?.length) throw new Error("Lecture incomplète des inscriptions.");
      }
    }
    if (ids.some(id => !inscrits.has(id))) {
      throw new PushSelectionError(
        "Au moins un chanteur ne fait plus partie de la saison active. Rechargez la sélection.",
      );
    }

    const avecAbonnement = new Set<string>();
    const abonnements = new Map<string, PushSubscriptionRow>();
    for (let i = 0; i < ids.length; i += 100) {
      const lot = ids.slice(i, i + 100);
      let offset = 0;
      while (true) {
        const { data, count, error } = await this.supabase
          .from("push_subscriptions")
          // Une simulation ne lit jamais p256dh/auth, même avec la clé serveur.
          .select(includeKeys
            ? "id,chanteur_id,endpoint,p256dh,auth"
            : "id,chanteur_id", { count: "exact" })
          .in("chanteur_id", lot)
          .order("id", { ascending: true })
          .range(offset, offset + 99)
          .returns<(PushSubscriptionRow & { chanteur_id: string })[]>();
        if (error) throw error;
        if (count === null) throw new Error("Comptage des abonnements indisponible.");
        for (const row of data ?? []) {
          avecAbonnement.add(row.chanteur_id);
          // Dédupliquer par la clé primaire de l'abonnement, notamment si
          // plusieurs inscriptions désignent le même chanteur.
          const key = row.id;
          if (!abonnements.has(key)) abonnements.set(key, row);
          if (includeKeys && abonnements.size > maxRecipients) {
            throw new PushSelectionError(
              `Plus de ${maxRecipients} appareils : envoi interrompu avant tout envoi.`, 413,
            );
          }
        }
        offset += data?.length ?? 0;
        if (offset >= count) break;
        if (!data?.length) throw new Error("Lecture incomplète des abonnements.");
      }
    }
    return {
      saison_id: saisonId,
      nombre_chanteurs: ids.length,
      nombre_appareils: abonnements.size,
      nombre_sans_abonnement: ids.filter(id => !avecAbonnement.has(id)).length,
      // Les champs cryptographiques sont absents en simulation. L'appelant
      // n'utilise alors que les compteurs et ne tente aucun envoi.
      subscriptions: [...abonnements.values()],
    };
  }

  // Protège contre les envois massifs accidentels et les expirations
  // de la requête Edge Function. Nous élargirons ce plafond si nécessaire.
  async findAllForBroadcast(maxRecipients = 200): Promise<PushSubscriptionRow[]> {
    const { data, error } = await this.supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .order("id", { ascending: true })
      .range(0, maxRecipients); // maxRecipients + 1 lignes pour détecter un dépassement

    if (error) throw error;
    if ((data?.length ?? 0) > maxRecipients) {
      throw new Error(`Plus de ${maxRecipients} appareils : envoi groupé interrompu avant tout envoi.`);
    }
    return data ?? [];
  }
}
