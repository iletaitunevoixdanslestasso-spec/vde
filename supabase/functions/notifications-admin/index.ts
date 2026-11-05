import { autoriserEnvoiPush } from "../push-test/PushAuthorizationService.ts";
import {
  NotificationMessagesRepository,
  notificationPagination,
  notificationResponse,
  notificationsCorsHeaders,
} from "../_shared/notification-messages.ts";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: notificationsCorsHeaders });
  if (request.method !== "POST") return notificationResponse(405, { error: "Méthode non autorisée." });
  try {
    // L'historique administratif requiert une vraie session Auth autorisée.
    // Le secret des anciens tests Push ne donne aucun accès à ces messages.
    const headers = new Headers(request.headers);
    headers.delete("x-push-test-secret");
    const authorization = await autoriserEnvoiPush(new Request(request.url, { headers }));
    if (!authorization.autorise) return notificationResponse(authorization.status, { error: authorization.message });
  } catch (error) {
    console.error("notifications-admin: vérification impossible", error);
    return notificationResponse(503, { error: "Vérification d'autorisation indisponible." });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("JSON");
  } catch {
    return notificationResponse(400, { error: "Corps JSON invalide." });
  }
  const pagination = notificationPagination(body);
  if (!pagination) return notificationResponse(400, { error: "Pagination invalide." });
  try {
    return notificationResponse(200, await new NotificationMessagesRepository().listAdmin(pagination.page, pagination.pageSize));
  } catch (error) {
    console.error("notifications-admin: historique indisponible", error);
    return notificationResponse(503, { error: "L'historique est momentanément indisponible." });
  }
});
