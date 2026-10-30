import { supabase } from "../core/supabase/client";

/**
 * Accès aux abonnements Push.
 * La table push_subscriptions n'est pas accessible directement au navigateur :
 * on utilise uniquement la fonction SQL SECURITY DEFINER protégée par token.
 */
export class PushSubscriptionRepository {
  async enregistrer(token, subscription) {
    const { error } = await supabase.rpc("enregistrer_abonnement_push", {
      p_token: token,
      p_subscription: subscription.toJSON(),
    });

    if (error) {
      throw error;
    }
  }
}

export const pushSubscriptionRepository = new PushSubscriptionRepository();
