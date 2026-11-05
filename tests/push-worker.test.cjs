// Run after npm run build: node tests/push-worker.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function fixture(pages = []) {
  const listeners = new Map();
  const notifications = [];
  const opened = [];
  const scope = 'https://app.example/';
  const self = {
    location: { origin: 'https://app.example' },
    registration: { scope, showNotification: async (title, options) => notifications.push({ title, ...options }) },
    clients: { matchAll: async () => pages, openWindow: async url => opened.push(url) },
    addEventListener: (type, listener) => listeners.set(type, listener),
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'public/push-handlers.js'), 'utf8'), { self, URL });
  async function dispatch(type, properties) {
    const pending = [];
    listeners.get(type)({ ...properties, waitUntil: promise => pending.push(promise) });
    assert.equal(pending.length, 1, 'le worker doit attendre le traitement');
    await Promise.all(pending);
  }
  return { dispatch, listeners, notifications, opened, scope };
}

test('réception du titre/message personnalisés avec attente de showNotification', async () => {
  const f = fixture();
  await f.dispatch('push', { data: { json: () => ({ title: 'Répétition', body: 'Rendez-vous jeudi' }) } });
  assert.equal(f.notifications[0].title, 'Répétition');
  assert.equal(f.notifications[0].body, 'Rendez-vous jeudi');
  assert.equal(f.notifications[0].icon, new URL('pwa-192x192.png', f.scope).href);
  assert.equal(f.notifications[0].data.url, f.scope);
});

test('notification de repli pour un message sans champs et pour du texte brut', async () => {
  const f = fixture();
  await f.dispatch('push', {});
  assert.equal(f.notifications[0].title, "Voix dans l'Est");
  assert.equal(f.notifications[0].body, 'Nouvelle information de la chorale.');
  await f.dispatch('push', { data: { json: () => { throw new Error('texte'); }, text: () => 'Message texte' } });
  assert.equal(f.notifications[1].body, 'Message texte');
});

test('un clic ferme la notification et remet une fenêtre de même origine au premier plan', async () => {
  let focused = 0;
  let closed = 0;
  const f = fixture([
    { url: 'https://other.example/', focus: async () => assert.fail('autre origine') },
    { url: 'https://app.example/chanteur/test', focus: async () => focused++ },
  ]);
  await f.dispatch('notificationclick', { notification: { close: () => closed++ } });
  assert.equal(closed, 1);
  assert.equal(focused, 1);
  assert.equal(f.opened.length, 0);
});

test('un clic sans fenêtre ouverte ouvre le périmètre de l’application', async () => {
  const f = fixture();
  await f.dispatch('notificationclick', { notification: { close() {} } });
  assert.deepEqual(f.opened, [f.scope]);
});

test('le traitement partagé ne force pas le cycle de mise à jour PWA', () => {
  const f = fixture();
  assert.deepEqual([...f.listeners.keys()], ['push', 'notificationclick']);
  const source = fs.readFileSync(path.join(root, 'public/push-handlers.js'), 'utf8');
  assert.equal(source.includes('skipWaiting'), false);
  const dev = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
  assert.match(dev, /importScripts\(["']push-handlers\.js["']\)/);
});

test('le worker de production charge réellement le même script Push et conserve la mise à jour sur confirmation', () => {
  const production = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'public/push-handlers.js'), 'utf8');
  assert.match(production, /importScripts\(["']push-handlers\.js["']\)/);
  assert.equal(fs.readFileSync(path.join(root, 'dist/push-handlers.js'), 'utf8'), source);
  assert.match(production, /SKIP_WAITING/);
  assert.match(production, /precacheAndRoute/);
  assert.match(production, /push-handlers\.js[^}]*revision/);
});
