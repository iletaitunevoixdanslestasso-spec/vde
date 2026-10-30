import { createClient } from "npm:@supabase/supabase-js@2";

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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
