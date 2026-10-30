import { autoriserEnvoiPush } from "./PushAuthorizationService.ts";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import {
  PushSubscriptionRepository,
  type PushSubscriptionRow,
} from "./PushSubscriptionRepository.ts";

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

// Conserve les clés VAPID déjà utilisées par le test individuel.
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

// Autorise les appels depuis React (Supabase Functions SDK).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-retry-count, x-push-test-secret, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, { status, headers: corsHeaders });
}

function pushTo(appServer: Awaited<ReturnType<typeof createApplicationServer>>, subscription: PushSubscriptionRow) {
  return appServer.subscribe({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }).pushTextMessage(JSON.stringify({
    title: "Voix dans l'Est",
    body: "Ceci est une notification Push de test.",
  }), { ttl: 60 });
}

function logPushError(error: unknown) {
  const pushStatus = error instanceof webpush.PushMessageError
    ? error.response.status
    : null;
  console.error("push-test: échec d'envoi", pushStatus ?? error);
  return pushStatus;
}

Deno.serve(async (request: Request) => {
  // Le navigateur interroge d'abord les règles CORS via OPTIONS.
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return respond(405, { error: "Méthode non autorisée." });
  }

  // Deux méthodes : secret pour les tests manuels existants, ou
  // JWT Supabase d'un compte administrateur autorisé pour React.
  try {
    const autorisation = await autoriserEnvoiPush(request);
    if (!autorisation.autorise) {
      return respond(autorisation.status, { error: autorisation.message });
    }
  } catch (error) {
    console.error("push-test: erreur de vérification d'autorisation", error);
    return respond(503, { error: "Vérification d'autorisation indisponible." });
  }

  let body: {
    subscription_id?: unknown;
    cible?: unknown;
    simulation?: unknown;
    confirmation?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Corps JSON invalide." });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return respond(400, { error: "Corps JSON invalide." });
  }

  // Nouveau mode : tous les appareils abonnés (sans filtrage par saison).
  if (body.cible === "tous") {
    try {
      const repository = new PushSubscriptionRepository();

      // Étape de validation : seul ce mode est à tester pour le moment.
      if (body.simulation === true) {
        const nombreAppareils = await repository.countAll();
        return respond(200, {
          success: true,
          simulation: true,
          nombre_appareils: nombreAppareils,
          message: "Simulation terminée : aucune notification envoyée.",
        });
      }

      // Garde-fou : impossible de diffuser à tous par mégarde.
      if (body.confirmation !== "ENVOYER_A_TOUS") {
        return respond(400, {
          error: "Confirmation explicite nécessaire pour un envoi à tous.",
        });
      }

      const subscriptions = await repository.findAllForBroadcast(200);
      if (subscriptions.length === 0) {
        return respond(200, { success: true, nombre_appareils: 0, acceptes: 0, echecs: 0 });
      }

      const appServer = await createApplicationServer();
      let acceptes = 0;
      let echecs = 0;

      // Petits lots pour limiter le nombre de requêtes simultanées.
      for (let i = 0; i < subscriptions.length; i += 5) {
        const lot = subscriptions.slice(i, i + 5);
        const results = await Promise.allSettled(lot.map((subscription) => pushTo(appServer, subscription)));

        for (const result of results) {
          if (result.status === "fulfilled") {
            acceptes++;
          } else {
            echecs++;
            logPushError(result.reason);
          }
        }
      }

      return respond(200, {
        success: echecs === 0,
        nombre_appareils: subscriptions.length,
        acceptes,
        echecs,
        message: "Envoi terminé. 'Acceptés' signifie acceptés par les services Push, pas affichés avec certitude.",
      });
    } catch (error) {
      console.error("push-test: diffusion collective impossible", error);
      return respond(502, {
        success: false,
        error: error instanceof Error ? error.message : "Échec de la diffusion.",
      });
    }
  }

  // Ancien mode : abonnement unique (inchangé).
  const id = body.subscription_id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return respond(400, { error: "subscription_id doit être un UUID." });
  }

  try {
    const repository = new PushSubscriptionRepository();
    const subscription = await repository.findById(id);
    if (!subscription) return respond(404, { error: "Abonnement introuvable." });

    const appServer = await createApplicationServer();
    await pushTo(appServer, subscription);

    return respond(200, { success: true, message: "Acceptée par le service Push." });
  } catch (error) {
    const pushStatus = logPushError(error);
    return respond(502, { success: false, error: "Échec de l'envoi Push.", pushStatus });
  }
});
