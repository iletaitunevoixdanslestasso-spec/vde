import { autoriserEnvoiPush } from "./PushAuthorizationService.ts";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import {
  PushSubscriptionRepository,
  PushSelectionError,
  type PushSubscriptionRow,
} from "./PushSubscriptionRepository.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

type PushMessage = { title: string; body: string };

// Les anciens tests peuvent continuer sans titre/message.
// Pour un envoi personnalisé, les deux champs sont obligatoires.
function lireMessage(body: Record<string, unknown>): PushMessage {
  if (body.titre === undefined && body.message === undefined) {
    return {
      title: "Voix dans l’Est",
      body: "Ceci est une notification Push de test.",
    };
  }

  if (typeof body.titre !== "string" || typeof body.message !== "string") {
    throw new Error("Les champs titre et message sont obligatoires.");
  }

  const title = body.titre.trim();
  const message = body.message.trim();
  if (!title || title.length > 80) {
    throw new Error("Le titre doit contenir entre 1 et 80 caractères.");
  }
  if (!message || message.length > 500) {
    throw new Error("Le message doit contenir entre 1 et 500 caractères.");
  }
  return { title, body: message };
}

function pushTo(
  appServer: Awaited<ReturnType<typeof createApplicationServer>>,
  subscription: PushSubscriptionRow,
  message: PushMessage,
) {
  return appServer.subscribe({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }).pushTextMessage(JSON.stringify(message), { ttl: 60 });
}

function logPushError(error: unknown) {
  const pushStatus = error instanceof webpush.PushMessageError
    ? error.response.status
    : null;
  console.error("push-test: échec d'envoi", pushStatus ?? error);
  return pushStatus;
}

async function diffuser(subscriptions: PushSubscriptionRow[], notification: PushMessage) {
  let acceptes = 0;
  let echecs = 0;
  if (!subscriptions.length) return { acceptes, echecs };
  const appServer = await createApplicationServer();
  // Petits lots pour limiter le nombre de requêtes simultanées.
  for (let i = 0; i < subscriptions.length; i += 5) {
    const results = await Promise.allSettled(
      subscriptions.slice(i, i + 5).map(subscription => pushTo(appServer, subscription, notification)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") acceptes++;
      else {
        echecs++;
        logPushError(result.reason);
      }
    }
  }
  return { acceptes, echecs };
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
    titre?: unknown;
    message?: unknown;
    saison_id?: unknown;
    chanteur_ids?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Corps JSON invalide." });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return respond(400, { error: "Corps JSON invalide." });
  }

  let notification: PushMessage;
  try {
    notification = lireMessage(body as Record<string, unknown>);
  } catch (error) {
    return respond(400, { error: error instanceof Error ? error.message : "Notification invalide." });
  }

  // Interface admin : sélection explicite de choristes de la saison active.
  if (body.cible === "selection") {
    if (typeof body.saison_id !== "string" || !UUID.test(body.saison_id) ||
      !Array.isArray(body.chanteur_ids) || body.chanteur_ids.length === 0 ||
      body.chanteur_ids.length > 1000 ||
      body.chanteur_ids.some(id => typeof id !== "string" || !UUID.test(id))) {
      return respond(400, { error: "Sélection invalide : saison et liste de 1 à 1 000 UUID chanteurs nécessaires." });
    }
    if (typeof body.simulation !== "boolean") {
      return respond(400, { error: "Le champ simulation doit être un booléen." });
    }
    if (!body.simulation && body.confirmation !== "ENVOYER_LA_SELECTION") {
      return respond(400, { error: "Confirmation explicite nécessaire pour l'envoi à la sélection." });
    }
    try {
      const repository = new PushSubscriptionRepository();
      const { subscriptions, ...compteurs } = await repository.prepareSelection(
        body.saison_id.toLowerCase(),
        [...new Set(body.chanteur_ids.map(id => id.toLowerCase()))],
        !body.simulation,
      );
      if (body.simulation) {
        return respond(200, {
          success: true, simulation: true, ...compteurs,
          message: "Simulation terminée : aucune notification envoyée.",
        });
      }
      const { acceptes, echecs } = await diffuser(subscriptions, notification);
      return respond(200, {
        success: echecs === 0, ...compteurs, acceptes, echecs,
        message: "Envoi terminé. 'Acceptés' signifie acceptés par les services Push, pas affichés avec certitude.",
      });
    } catch (error) {
      if (error instanceof PushSelectionError) return respond(error.status, { success: false, error: error.message });
      console.error("push-test: envoi à la sélection impossible", error);
      return respond(502, { success: false, error: "Impossible de préparer ou d'envoyer la sélection." });
    }
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

      const { acceptes, echecs } = await diffuser(subscriptions, notification);

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
  if (typeof id !== "string" || !UUID.test(id)) {
    return respond(400, { error: "subscription_id doit être un UUID." });
  }

  try {
    const repository = new PushSubscriptionRepository();
    const subscription = await repository.findById(id);
    if (!subscription) return respond(404, { error: "Abonnement introuvable." });

    const appServer = await createApplicationServer();
    await pushTo(appServer, subscription, notification);

    return respond(200, { success: true, message: "Acceptée par le service Push." });
  } catch (error) {
    const pushStatus = logPushError(error);
    return respond(502, { success: false, error: "Échec de l'envoi Push.", pushStatus });
  }
});
