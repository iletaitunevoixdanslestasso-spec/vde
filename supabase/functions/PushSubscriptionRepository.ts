import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { PushSubscriptionRepository } from "./PushSubscriptionRepository.ts";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret ${name} manquant.`);
  return value.trim();
}

function decodeBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(
    atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    (char) => char.charCodeAt(0),
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Convertit les clés produites par `npx web-push generate-vapid-keys`
// au format JWK attendu par la bibliothèque Deno.
async function createApplicationServer() {
  const publicBytes = decodeBase64Url(env("VAPID_PUBLIC_KEY"));
  const privateBytes = decodeBase64Url(env("VAPID_PRIVATE_KEY"));

  if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32) {
    throw new Error("Format des clés VAPID invalide.");
  }

  const publicJwk = {
    kty: "EC",
    crv: "P-256",
    x: encodeBase64Url(publicBytes.slice(1, 33)),
    y: encodeBase64Url(publicBytes.slice(33, 65)),
  };

  const vapidKeys = await webpush.importVapidKeys({
    publicKey: publicJwk,
    privateKey: { ...publicJwk, d: encodeBase64Url(privateBytes) },
  });

  return await webpush.ApplicationServer.new({
    contactInformation: env("VAPID_SUBJECT"),
    vapidKeys,
  });
}

function respond(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, { status });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return respond(405, { error: "Méthode non autorisée." });
  }

  // Fonction réservée aux tests : elle ne doit jamais être appelée
  // depuis le code React, et ce secret ne doit jamais être exposé au navigateur.
  const expectedSecret = Deno.env.get("PUSH_TEST_SECRET");
  if (!expectedSecret) return respond(503, { error: "PUSH_TEST_SECRET non configuré." });
  if (request.headers.get("x-push-test-secret") !== expectedSecret) {
    return respond(401, { error: "Non autorisé." });
  }

  let body: { subscription_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Corps JSON invalide." });
  }

  const id = body.subscription_id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return respond(400, { error: "subscription_id doit être un UUID." });
  }

  try {
    const repository = new PushSubscriptionRepository();
    const subscription = await repository.findById(id);
    if (!subscription) return respond(404, { error: "Abonnement introuvable." });

    const appServer = await createApplicationServer();
    await appServer.subscribe({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }).pushTextMessage(JSON.stringify({
      title: "Voix dans l'Est",
      body: "Ceci est une notification Push de test.",
    }), { ttl: 60 });

    // Succès auprès du service Push ≠ affichage garanti sur l'appareil.
    return respond(200, { success: true, message: "Acceptée par le service Push." });
  } catch (error) {
    const pushStatus = error instanceof webpush.PushMessageError
      ? error.response.status
      : null;
    console.error("push-test: échec d'envoi", pushStatus ?? error);
    return respond(502, { success: false, error: "Échec de l'envoi Push.", pushStatus });
  }
});
