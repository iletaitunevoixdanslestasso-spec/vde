
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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
      data: { url: self.registration.scope }
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

    if (page) {
      await page.focus();
      return;
    }

    await self.clients.openWindow(self.registration.scope);
  })());
});
