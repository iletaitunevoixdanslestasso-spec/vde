function estNotificationMessageId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Réception d'une notification Push
self.addEventListener("push", (event) => {
  let message = {};

  try {
    message = event.data?.json() ?? {};
  } catch {
    message = {
      body: event.data?.text() || "Nouvelle information de la chorale."
    };
  }

  const title = typeof message.title === "string"
    ? message.title
    : "Voix dans l'Est";

  const body = typeof message.body === "string"
    ? message.body
    : "Nouvelle information de la chorale.";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: new URL("pwa-192x192.png", self.registration.scope).href,
      data: {
        url: self.registration.scope,
        ...(estNotificationMessageId(message.notification_id) ? { notification_id: message.notification_id } : {})
      }
    })
  );
});

// Clic sur une notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    const page = pages.find(
      client => new URL(client.url).origin === self.location.origin
    );

    const ouvrirMessages = estNotificationMessageId(event.notification.data?.notification_id);
    if (page) {
      await page.focus();
      if (ouvrirMessages) page.postMessage({ type: "OPEN_NOTIFICATIONS" });
      return;
    }

    // Le token personnel reste sur l'appareil, jamais dans le contenu Push.
    const destination = ouvrirMessages
      ? new URL("?pwa=1&notifications=1", self.registration.scope).href
      : self.registration.scope;
    await self.clients.openWindow(destination);
  })());
});
