import { createSupabaseAdmin, validateChanteurToken } from "../_shared/chanteur.ts";
import {
  NotificationMessagesRepository,
  notificationPagination,
  notificationResponse,
  notificationsCorsHeaders,
} from "../_shared/notification-messages.ts";

const NOTIFICATION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: notificationsCorsHeaders });
  if (request.method !== "POST") return notificationResponse(405, { error: "Méthode non autorisée." });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("JSON");
  } catch {
    return notificationResponse(400, { error: "Corps JSON invalide." });
  }
  if (typeof body.token !== "string" || !body.token.trim()) return notificationResponse(400, { error: "Token chanteur manquant." });
  if (!["list", "count", "read"].includes(body.action as string)) return notificationResponse(400, { error: "Action invalide." });
  const pagination = notificationPagination(body);
  if (!pagination) return notificationResponse(400, { error: "Pagination invalide." });
  if (body.action === "read" && (typeof body.notification_id !== "string" || !NOTIFICATION_UUID.test(body.notification_id) ||
    (body.lu !== undefined && typeof body.lu !== "boolean"))) {
    return notificationResponse(400, { error: "Notification ou état de lecture invalide." });
  }
  try {
    const db = createSupabaseAdmin();
    const identity = await validateChanteurToken(db, body.token.trim());
    if (!identity.chanteur) return notificationResponse(identity.status, { error: identity.status === 500 ? "Vérification du chanteur indisponible." : identity.error });
    // L'identité vient exclusivement du profil validé, jamais du corps JSON.
    const chanteurId = identity.chanteur.id;
    const repository = new NotificationMessagesRepository(db);
    if (body.action === "count") return notificationResponse(200, { non_lus: await repository.countUnread(chanteurId) });
    if (body.action === "list") return notificationResponse(200, await repository.listForSinger(chanteurId, pagination.page, pagination.pageSize));
    const row = await repository.setRead(chanteurId, (body.notification_id as string).toLowerCase(), body.lu !== false);
    if (!row) return notificationResponse(404, { error: "Notification introuvable." });
    return notificationResponse(200, { ...row, non_lus: await repository.countUnread(chanteurId) });
  } catch (error) {
    console.error("notifications: lecture impossible", error);
    return notificationResponse(503, { error: "Les messages sont momentanément indisponibles." });
  }
});
