import { createClient } from "npm:@supabase/supabase-js@2";

type Autorisation =
  | { autorise: true }
  | { autorise: false; status: 401 | 403; message: string };

/**
 * Authentifie et autorise l'envoi de notifications.
 * - Tests manuels : PUSH_TEST_SECRET reste accepté, côté serveur seulement.
 * - Interface React : JWT utilisateur vérifié auprès de Supabase Auth,
 *   puis user.id comparé à PUSH_ADMIN_USER_IDS, jamais exposé au navigateur.
 * La simple présence d'une session ne confère aucun droit d'envoi.
 */
export async function autoriserEnvoiPush(request: Request): Promise<Autorisation> {
  const testSecret = Deno.env.get("PUSH_TEST_SECRET");
  const providedSecret = request.headers.get("x-push-test-secret");

  if (testSecret && providedSecret && providedSecret === testSecret) {
    return { autorise: true };
  }

  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token) {
    return { autorise: false, status: 401, message: "Authentification nécessaire." };
  }

  // Le contrôle repose sur l'UID Auth de chaque administrateur,
  // et non sur un e-mail modifiable ou un rôle transmis par React.
  const adminUserIds = new Set(
    (Deno.env.get("PUSH_ADMIN_USER_IDS") ?? "")
      .split(",")
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean),
  );
  if (adminUserIds.size === 0) {
    return { autorise: false, status: 403, message: "Aucun administrateur Push configuré." };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Configuration Supabase Auth manquante.");
  }

  const authClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // getUser(token) vérifie le JWT auprès du service Auth.
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return { autorise: false, status: 401, message: "Session invalide ou expirée." };
  }

  if (!adminUserIds.has(data.user.id.toLowerCase())) {
    return { autorise: false, status: 403, message: "Droits administrateur insuffisants." };
  }

  return { autorise: true };
}
