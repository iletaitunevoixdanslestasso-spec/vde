
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Le même traitement Push est chargé par le worker PWA généré en production.
importScripts("push-handlers.js");
