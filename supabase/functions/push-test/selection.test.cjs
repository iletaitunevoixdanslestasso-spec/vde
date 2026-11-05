// Run with Node.js 24: node supabase/functions/push-test/selection.test.cjs
// Exercises the real handler, authorization and repository against an in-memory
// PostgREST double. No credentials, Supabase calls or actual Push sends.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');
const id = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const season = id(1);
const first = id(11);
const second = id(12);
const third = id(13);

function fixture() {
  const state = {
    saisons: [{ id: season, active: true, deleted_at: null }],
    chanteurs: [first, second, third].map(id => ({ id, deleted_at: null })),
    saison_chanteurs: [first, second, third].map((chanteur_id, i) => ({
      id: id(100 + i), saison_id: season, chanteur_id, deleted_at: null,
    })),
    push_subscriptions: [first, first, second].map((chanteur_id, i) => ({
      id: id(200 + i), chanteur_id, endpoint: `mock:${i}`, p256dh: 'key', auth: 'auth',
    })),
    queries: [], sends: [], signatures: 0, failures: new Set(), pageLimit: Infinity,
    notification_messages: [], notification_destinataires: [], writes: [],
    failCreate: false, failFinish: false, failVapid: false,
    syncFailures: new Set(),
    admin: { id: 'admin', email: 'admin@example.com', user_metadata: { full_name: 'Chef de chœur' } },
  };
  class Query {
    constructor(table) { this.table = table; this.filters = []; }
    select(columns, options = {}) { this.columns = columns; this.options = options; return this; }
    update(values) { this.values = values; return this; }
    eq(field, value) { this.filters.push([field, value, 'eq']); return this; }
    is(field, value) { this.filters.push([field, value, 'eq']); return this; }
    in(field, value) { this.filters.push([field, value, 'in']); return this; }
    order() { return this; }
    limit(value) { this.to = value - 1; return this; }
    range(from, to) { this.from = from; this.to = to; return this; }
    returns() { return this; }
    maybeSingle() { this.single = true; return this; }
    then(resolve, reject) {
      try {
        state.queries.push({ table: this.table, columns: this.columns, filters: this.filters, from: this.from });
        let rows = [...state[this.table]].filter(row => this.filters.every(([field, value, operator]) => {
          const actual = field === 'chanteurs.deleted_at'
            ? state.chanteurs.find(singer => singer.id === row.chanteur_id)?.deleted_at
            : row[field];
          return operator === 'in' ? value.includes(actual) : actual === value;
        }));
        if (this.values) {
          if (state.failFinish) return Promise.resolve({ data: null, error: new Error('finish DB failed') }).then(resolve, reject);
          rows.forEach(row => Object.assign(row, this.values));
          state.writes.push({ table: this.table, values: this.values });
        }
        if (this.columns.includes('!inner')) {
          rows = rows.filter(row => state.chanteurs.some(singer => singer.id === row.chanteur_id));
        }
        rows.sort((a, b) => (a.id ?? a.chanteur_id).localeCompare(b.id ?? b.chanteur_id));
        const count = rows.length;
        const from = this.from || 0;
        rows = rows.slice(from, Math.min(this.to === undefined ? Infinity : this.to + 1, from + state.pageLimit));
        // Respect selected fields so simulation cannot accidentally read keys.
        const columns = this.columns.split(',').map(column => column.trim());
        const data = this.options.head ? null : rows.map(row => Object.fromEntries(
          Object.entries(row).filter(([name]) => columns.includes(name)),
        ));
        return Promise.resolve({ data: this.single ? data?.[0] ?? null : data,
          count: this.options.count === 'exact' ? count : null, error: null }).then(resolve, reject);
      } catch (error) { return Promise.reject(error).then(resolve, reject); }
    }
  }
  const db = {
    from: table => new Query(table),
    rpc: async (name, args) => {
      assert.equal(name, 'creer_notification_message');
      if (state.beforeCreate) state.beforeCreate();
      if (state.failCreate) return { data: null, error: new Error('archive DB failed') };
      const ids = [...new Set(args.p_chanteur_ids)].sort();
      const existing = state.notification_messages.find(row => row.id === args.p_id);
      if (existing) {
        const previousIds = state.notification_destinataires.filter(row => row.notification_id === args.p_id).map(row => row.chanteur_id).sort();
        if (existing.saison_id !== args.p_saison_id || existing.titre !== args.p_titre ||
          existing.contenu !== args.p_contenu || existing.auteur_id !== args.p_auteur_id ||
          JSON.stringify(previousIds) !== JSON.stringify(ids)) return { data: null, error: { message: 'NOTIFICATION_CONFLICT' } };
        return { data: { created: false, message: { ...existing } }, error: null };
      }
      const active = state.saisons.filter(row => row.active && !row.deleted_at);
      if (active.length !== 1 || active[0].id !== args.p_saison_id) return { data: null, error: { message: 'NOTIFICATION_SEASON' } };
      if (ids.some(id => !state.saison_chanteurs.some(row => row.chanteur_id === id && row.saison_id === args.p_saison_id && !row.deleted_at &&
        state.chanteurs.some(singer => singer.id === id && !singer.deleted_at)))) return { data: null, error: { message: 'NOTIFICATION_RECIPIENTS' } };
      const message = { id: args.p_id, saison_id: args.p_saison_id, titre: args.p_titre, contenu: args.p_contenu,
        auteur_id: args.p_auteur_id, auteur_nom: args.p_auteur_nom, created_at: '2026-11-05T12:00:00Z', statut_push: 'en_cours',
        nombre_chanteurs: ids.length, nombre_appareils: args.p_nombre_appareils, nombre_sans_abonnement: args.p_nombre_sans_abonnement,
        acceptes: 0, echecs: 0 };
      state.notification_messages.push(message);
      state.notification_destinataires.push(...ids.map(chanteur_id => ({ notification_id: args.p_id, chanteur_id, lu_le: null })));
      state.writes.push({ rpc: name, args });
      return { data: { created: true, message: { ...message } }, error: null };
    },
    auth: { getUser: async token => token === 'admin'
      ? { data: { user: state.admin }, error: null }
      : token === 'reader' ? { data: { user: { id: 'reader' } }, error: null }
      : { data: { user: null }, error: new Error('invalid') } },
  };
  let handler;
  const env = {
    SUPABASE_URL: 'https://supabase.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake',
    PUSH_TEST_SECRET: 'manual-secret', PUSH_ADMIN_USER_IDS: 'admin',
    VAPID_PUBLIC_KEY: btoa(String.fromCharCode(4) + String.fromCharCode(1).repeat(64)),
    VAPID_PRIVATE_KEY: btoa(String.fromCharCode(1).repeat(32)), VAPID_SUBJECT: 'mailto:test@example.com',
  };
  const context = vm.createContext({
    console: { error() {} }, Request, Response, Headers, URL, Uint8Array, TextEncoder, Intl, atob, btoa, crypto: webcrypto,
    Deno: { env: { get: name => env[name] }, serve: fn => { handler = fn; } },
    createClient: () => db,
    webpush: {
      PushMessageError: class extends Error {}, importVapidKeys: async () => {
        if (state.failVapid) throw new Error('VAPID unavailable');
        return {};
      },
      ApplicationServer: { new: async () => {
        state.signatures++;
        return { subscribe: subscription => {
          if (state.syncFailures.has(subscription.endpoint)) throw new Error('Invalid subscription');
          return { pushTextMessage: async payload => {
          if (JSON.parse(payload).notification_id) assert(state.notification_messages.some(message => message.id === JSON.parse(payload).notification_id));
          state.sends.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload), bytes: Buffer.byteLength(payload, 'utf8') });
          if (state.failures.has(subscription.endpoint)) throw new Error('Push unavailable');
          } };
        } };
      } },
    },
  });
  for (const file of ['../_shared/chanteur.ts', '../_shared/notification-messages.ts', '../_shared/notification-content.js', 'PushAuthorizationService.ts', 'PushSubscriptionRepository.ts', 'index.ts']) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8')
      .replace(/^import[\s\S]*?from ["'][^"']+["'];\n/gm, '').replace(/^export /gm, '');
    vm.runInContext(stripTypeScriptTypes(source), context);
  }
  const call = async (overrides = {}, headers = { authorization: 'Bearer admin' }) => {
    const body = { cible: 'selection', saison_id: season, chanteur_ids: [first, second, third],
      titre: ' Répétition ', message: ' Venez jeudi ', simulation: true, ...overrides };
    const response = await handler(new Request('https://test.invalid', {
      method: 'POST', headers, body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  };
  return { state, call };
}

test('authorization remains mandatory, including simulation', async () => {
  const { state, call } = fixture();
  assert.equal((await call({}, {})).status, 401);
  assert.equal((await call({}, { authorization: 'Bearer reader' })).status, 403);
  assert.equal(state.queries.length, 0);
  assert.equal(state.sends.length, 0);
});

test('simulation deduplicates singers/subscriptions, reports missing subscriptions, reads no keys', async () => {
  const { state, call } = fixture();
  state.push_subscriptions.push({ ...state.push_subscriptions[0] });
  state.pageLimit = 1; // Force pagination despite the normal 100-row pages.
  const result = await call({ chanteur_ids: [first.toUpperCase(), first, second, third] });
  assert.equal(result.status, 200);
  assert.equal(result.body.nombre_chanteurs, 3);
  assert.equal(result.body.nombre_appareils, 3);
  assert.equal(result.body.nombre_sans_abonnement, 1);
  assert.equal(result.body.saison_id, season);
  assert.equal(result.body.simulation, true);
  assert.equal(result.body.historique_disponible, true);
  assert.equal('subscriptions' in result.body, false);
  assert.equal(state.sends.length, 0);
  assert.equal(state.signatures, 0);
  assert.equal(state.writes.length, 0);
  assert.equal(state.notification_messages.length, 0);
  const reads = state.queries.filter(q => q.table === 'push_subscriptions');
  assert(reads.length >= 4);
  assert(reads.every(q => q.columns === 'id,chanteur_id'));
});

test('malformed, empty, oversized selections and missing explicit simulation are rejected', async () => {
  const { state, call } = fixture();
  for (const overrides of [
    { chanteur_ids: [] }, { chanteur_ids: ['bad'] }, { chanteur_ids: [null] },
    { chanteur_ids: Array(1001).fill(first) }, { saison_id: 'bad' },
    { simulation: undefined }, { simulation: 'true' },
    { simulation: false }, { simulation: false, confirmation: 'ENVOYER_A_TOUS' },
    { envoi_id: 'bad' },
  ]) assert.equal((await call(overrides)).status, 400);
  assert.equal(state.queries.length, 0);
  assert.equal(state.signatures, 0);
});

test('only one nondeleted active season, matching the displayed season, is accepted', async () => {
  for (const scenario of ['changed', 'none', 'multiple', 'deleted']) {
    const { state, call } = fixture();
    if (scenario === 'changed') state.saisons[0].id = id(2);
    if (scenario === 'none') state.saisons[0].active = false;
    if (scenario === 'multiple') state.saisons.push({ id: id(2), active: true, deleted_at: null });
    if (scenario === 'deleted') state.saisons[0].deleted_at = '2026-01-01';
    assert.equal((await call()).status, 409);
    assert.equal(state.signatures, 0);
  }
});

test('cross-season, removed memberships and deleted/missing singers block all sending', async () => {
  for (const scenario of ['wrong-season', 'removed', 'deleted-singer', 'missing-singer']) {
    const { state, call } = fixture();
    if (scenario === 'wrong-season') state.saison_chanteurs[0].saison_id = id(2);
    if (scenario === 'removed') state.saison_chanteurs[0].deleted_at = '2026-01-01';
    if (scenario === 'deleted-singer') state.chanteurs[0].deleted_at = '2026-01-01';
    if (scenario === 'missing-singer') state.chanteurs.shift();
    const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION' });
    assert.equal(result.status, 400);
    assert.equal(state.queries.some(q => q.table === 'push_subscriptions'), false);
    assert.equal(state.signatures, 0);
  }
});

test('send revalidates membership and season after a successful simulation', async () => {
  for (const scenario of ['membership', 'season']) {
    const { state, call } = fixture();
    assert.equal((await call()).status, 200);
    if (scenario === 'membership') state.saison_chanteurs[0].deleted_at = '2026-01-01';
    else state.saisons[0].id = id(2);
    assert.equal((await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION' })).status,
      scenario === 'membership' ? 400 : 409);
    assert.equal(state.signatures, 0);
  }
});

test('simulation counts beyond 1,000 rows; real send refuses >200 devices before signing', async () => {
  const { state, call } = fixture();
  state.push_subscriptions = Array.from({ length: 1205 }, (_, i) => ({
    id: id(10000 + i), chanteur_id: first, endpoint: `mock:${i}`, p256dh: 'key', auth: 'auth',
  }));
  const simulation = await call();
  assert.equal(simulation.status, 200);
  assert.equal(simulation.body.nombre_appareils, 1205);
  assert.equal(simulation.body.nombre_sans_abonnement, 2);
  assert.equal((await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION' })).status, 413);
  assert.equal(state.sends.length, 0);
  assert.equal(state.signatures, 0);
});

test('only selected subscriptions receive personalized payload; partial failures are counted', async () => {
  const { state, call } = fixture();
  state.push_subscriptions.push({ ...state.push_subscriptions[0] });
  state.push_subscriptions.push({ id: id(999), chanteur_id: id(999), endpoint: 'unselected' });
  state.failures.add('mock:1');
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', chanteur_ids: [first, first, third] });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, false);
  assert.equal(result.body.nombre_chanteurs, 2);
  assert.equal(result.body.nombre_appareils, 2);
  assert.equal(result.body.nombre_sans_abonnement, 1);
  assert.equal(result.body.acceptes, 1);
  assert.equal(result.body.echecs, 1);
  assert.deepEqual(state.sends.map(s => s.endpoint), ['mock:0', 'mock:1']);
  assert(state.sends.every(s => s.payload.title === 'Répétition' && s.payload.body === 'Venez jeudi'));
});

test('the full multiline message is archived while every Push carries only a bounded Unicode preview', async () => {
  const { state, call } = fixture();
  const titre = 'Programme de la chorale 🎶';
  const message = `Bonjour à toutes et à tous 👨‍👩‍👧‍👦 !\n\n${'Notre prochaine répétition prépare le concert. 🎵\n'.repeat(30)}\nÀ jeudi, avec vos partitions !`;
  assert(message.length > 500);
  const result = await call({ titre, message: `  ${message}\n `, simulation: false,
    confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) });
  assert.equal(result.status, 200);
  assert.equal(result.body.acceptes, 3);
  assert.equal(state.notification_messages.length, 1);
  assert.equal(state.notification_messages[0].titre, titre);
  assert.equal(state.notification_messages[0].contenu, message);
  const archive = state.writes.find(write => write.rpc === 'creer_notification_message');
  assert.equal(archive.args.p_contenu, message);
  for (const send of state.sends) {
    assert.equal(send.payload.title, titre);
    assert.equal(send.payload.notification_id, id(300));
    assert(send.payload.body.length < message.length);
    assert(send.payload.body.startsWith('Bonjour à toutes et à tous 👨‍👩‍👧‍👦 !'));
    assert(send.bytes <= 3000);
  }
  assert(state.sends.every(send => JSON.stringify(send.payload) === JSON.stringify(state.sends[0].payload)));
});

test('actual Push JSON respects its UTF-8 budget with large graphemes and escaped characters', async () => {
  const { state, call } = fixture();
  const titre = '"'.repeat(80);
  const message = `👨‍👩‍👧‍👦${'\u0301'.repeat(2000)}${' 🎶\n'.repeat(200)}`.trim();
  const result = await call({ titre, message, simulation: false,
    confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) });
  assert.equal(result.status, 200);
  assert.equal(result.body.acceptes, 3);
  assert.equal(state.notification_messages[0].contenu, message);
  for (const send of state.sends) {
    assert.equal(send.payload.title, titre);
    assert.equal(send.payload.notification_id, id(300));
    assert.equal(typeof send.payload.body, 'string');
    assert(send.payload.body.length < message.length);
    assert(send.bytes <= 3000);
  }
});

test('content above the full-message UTF-8 byte limit is rejected before any query, archive or Push', async () => {
  const { state, call } = fixture();
  const message = 'é'.repeat(524289);
  assert(Buffer.byteLength(message, 'utf8') > 1048576);
  for (const simulation of [true, false]) {
    const result = await call({ message, simulation, confirmation: 'ENVOYER_LA_SELECTION' });
    assert.equal(result.status, 400);
  }
  assert.equal(state.queries.length, 0);
  assert.equal(state.writes.length, 0);
  assert.equal(state.notification_messages.length, 0);
  assert.equal(state.notification_destinataires.length, 0);
  assert.equal(state.sends.length, 0);
  assert.equal(state.signatures, 0);
});

test('selected choristers with no subscriptions return zero sends without signing', async () => {
  const { state, call } = fixture();
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', chanteur_ids: [third] });
  assert.equal(result.status, 200);
  assert.equal(result.body.nombre_appareils, 0);
  assert.equal(result.body.nombre_sans_abonnement, 1);
  assert.equal(result.body.acceptes, 0);
  assert.equal(result.body.echecs, 0);
  assert.equal(state.signatures, 0);
  assert.equal(state.notification_messages.length, 1);
  assert.equal(state.notification_messages[0].statut_push, 'termine');
  assert.equal(state.notification_destinataires.length, 1);
  assert.equal(state.notification_destinataires[0].chanteur_id, third);
});

test('real sends archive verified author and every recipient before Push, without accepting client authorship', async () => {
  const { state, call } = fixture();
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300),
    auteur_id: 'forged', auteur_nom: 'Fake', created_at: '1900-01-01' });
  assert.equal(result.status, 200);
  assert.equal(result.body.notification_id, id(300));
  assert.equal(result.body.historique_disponible, true);
  const message = state.notification_messages[0];
  assert.equal(message.auteur_id, 'admin');
  assert.equal(message.auteur_nom, 'Chef de chœur');
  assert.equal(message.titre, 'Répétition');
  assert.equal(message.contenu, 'Venez jeudi');
  assert.equal(message.created_at, '2026-11-05T12:00:00Z');
  assert.equal(message.statut_push, 'termine');
  assert.equal(state.notification_destinataires.length, 3);
  assert(state.sends.every(send => send.payload.notification_id === id(300)));
  assert(state.sends.every(send => !('url' in send.payload) && !('token' in send.payload) && !('chanteur_id' in send.payload)));
});

test('database failure before archival blocks all Push sends and leaves no partial inbox', async () => {
  const { state, call } = fixture();
  state.failCreate = true;
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) });
  assert.equal(result.status, 502);
  assert.equal(state.sends.length, 0);
  assert.equal(state.signatures, 0);
  assert.equal(state.notification_messages.length, 0);
  assert.equal(state.notification_destinataires.length, 0);
});

test('atomic archival rechecks eligibility after subscriptions were prepared', async () => {
  for (const scenario of ['membership', 'season']) {
    const { state, call } = fixture();
    state.beforeCreate = () => {
      if (scenario === 'membership') state.saison_chanteurs[0].deleted_at = '2026-11-05';
      else state.saisons[0].active = false;
    };
    const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) });
    assert.equal(result.status, scenario === 'membership' ? 400 : 409);
    assert.equal(state.sends.length, 0);
    assert.equal(state.notification_messages.length, 0);
    assert.equal(state.notification_destinataires.length, 0);
  }
});

test('retrying the same completed ID returns original counters without sending after season/device changes', async () => {
  const { state, call } = fixture();
  const send = { simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) };
  assert.equal((await call(send)).body.acceptes, 3);
  state.saisons[0].active = false;
  state.push_subscriptions.length = 0;
  state.admin.user_metadata.full_name = 'Nom changé';
  state.pageLimit = 1; // Existing-recipient matching must also paginate fully.
  const result = await call({ ...send, chanteur_ids: [third, second, first, first] });
  assert.equal(result.status, 200);
  assert.equal(result.body.duplique, true);
  assert.equal(result.body.acceptes, 3);
  assert.equal(result.body.nombre_appareils, 3);
  assert.equal(result.body.nombre_sans_abonnement, 1);
  assert.equal(state.sends.length, 3);
  assert.equal(state.notification_messages.length, 1);
  assert.equal(state.notification_messages[0].auteur_nom, 'Chef de chœur');
});

test('an ID cannot be reused with changed content, season, author or recipients', async () => {
  for (const scenario of ['title', 'body', 'season', 'author', 'recipients']) {
    const { state, call } = fixture();
    const send = { simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) };
    await call(send);
    const changes = {};
    if (scenario === 'title') changes.titre = 'Autre titre';
    if (scenario === 'body') changes.message = 'Autre contenu';
    if (scenario === 'season') changes.saison_id = id(2);
    if (scenario === 'author') state.notification_messages[0].auteur_id = 'another-admin';
    if (scenario === 'recipients') changes.chanteur_ids = [first];
    assert.equal((await call({ ...send, ...changes })).status, 409);
    assert.equal(state.sends.length, 3);
    assert.equal(state.notification_messages.length, 1);
  }
});

test('retry matching compares the complete message, including changes beyond the identical Push preview', async () => {
  const { state, call } = fixture();
  const prefix = 'La prochaine répétition aura lieu jeudi. '.repeat(30);
  const send = { simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300),
    message: `${prefix}\nMerci de venir à 19 h.` };
  const initial = await call(send);
  assert.equal(initial.status, 200);
  assert.equal(initial.body.acceptes, 3);
  assert.equal((await call(send)).body.duplique, true);
  const changed = await call({ ...send, message: `${prefix}\nMerci de venir à 20 h.` });
  assert.equal(changed.status, 409);
  assert.equal(state.notification_messages[0].contenu, send.message);
  assert.equal(state.notification_messages.length, 1);
  assert.equal(state.sends.length, 3);
  assert.equal(state.sends[0].payload.body.includes('19 h'), false);
  assert.equal(state.sends[0].payload.body.includes('20 h'), false);
});

test('concurrent requests sharing one ID produce one inbox and at most one Push per subscription', async () => {
  const { state, call } = fixture();
  const send = { simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) };
  const results = await Promise.all([call(send), call(send)]);
  assert(results.every(result => [200, 409].includes(result.status)));
  assert(results.some(result => result.status === 200));
  assert.equal(state.notification_messages.length, 1);
  assert.equal(state.notification_destinataires.length, 3);
  assert.equal(state.sends.length, 3);
});

test('Push initialization failure keeps the inbox and records errors instead of deleting the message', async () => {
  const { state, call } = fixture();
  state.failVapid = true;
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, false);
  assert.equal(result.body.echecs, 3);
  assert.equal(state.notification_messages[0].statut_push, 'erreur');
  assert.equal(state.notification_destinataires.length, 3);
  assert.equal(state.sends.length, 0);
});

test('a synchronous subscription failure after a successful batch preserves all earlier Push counters', async () => {
  const { state, call } = fixture();
  state.push_subscriptions = Array.from({ length: 6 }, (_, i) => ({
    id: id(200 + i), chanteur_id: first, endpoint: `mock:${i}`, p256dh: 'key', auth: 'auth',
  }));
  state.syncFailures.add('mock:5');
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) });
  assert.equal(result.status, 200);
  assert.equal(result.body.acceptes, 5);
  assert.equal(result.body.echecs, 1);
  assert.equal(result.body.statut_push, 'partiel');
  assert.equal(state.sends.length, 5);
  assert.equal(state.notification_messages[0].acceptes, 5);
  assert.equal(state.notification_messages[0].echecs, 1);
});

test('failure to save the Push outcome never permits retrying a possibly sent message', async () => {
  const { state, call } = fixture();
  state.failFinish = true;
  const send = { simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) };
  const result = await call(send);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, false);
  assert.equal(typeof result.body.avertissement, 'string');
  assert.equal(result.body.statut_push, 'en_cours');
  assert.equal(state.notification_messages[0].statut_push, 'en_cours');
  assert.equal(state.sends.length, 3);
  assert.equal((await call(send)).status, 409);
  assert.equal(state.sends.length, 3);
  assert.equal(state.notification_messages.length, 1);
});

test('the legacy manual actor is named by the server when publishing a selection', async () => {
  const { state, call } = fixture();
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', envoi_id: id(300) }, { 'x-push-test-secret': 'manual-secret' });
  assert.equal(result.status, 200);
  assert.equal(state.notification_messages[0].auteur_id, null);
  assert.equal(state.notification_messages[0].auteur_nom, 'Test manuel');
});

test('legacy all and individual manual tests remain available', async () => {
  const { state, call } = fixture();
  const headers = { 'x-push-test-secret': 'manual-secret' };
  let result = await call({ cible: 'tous' }, headers);
  assert.equal(result.status, 200);
  assert.equal(result.body.nombre_appareils, 3);
  result = await call({ cible: 'tous', simulation: false, confirmation: 'ENVOYER_A_TOUS' }, headers);
  assert.equal(result.status, 200);
  assert.equal(result.body.acceptes, 3);
  result = await call({ cible: undefined, subscription_id: id(200) }, headers);
  assert.equal(result.status, 200);
  assert.equal(state.sends.length, 4);
  assert.equal(state.notification_messages.length, 0);
  assert.equal(state.notification_destinataires.length, 0);
});

test('legacy all and individual sends share the short Push preview and keep their default test message', async () => {
  const { state, call } = fixture();
  const headers = { 'x-push-test-secret': 'manual-secret' };
  const message = 'Texte long 🎶, destiné à un aperçu court.\n'.repeat(30);
  const all = await call({ cible: 'tous', message, simulation: false, confirmation: 'ENVOYER_A_TOUS' }, headers);
  assert.equal(all.status, 200);
  assert.equal(all.body.acceptes, 3);
  const individual = await call({ cible: undefined, subscription_id: id(200), message }, headers);
  assert.equal(individual.status, 200);
  assert.equal(state.sends.length, 4);
  assert(state.sends.every(send => send.payload.body.length < message.length && send.bytes <= 3000));
  assert(state.sends.every(send => send.payload.body === state.sends[0].payload.body));
  assert.equal(state.notification_messages.length, 0);
  const legacy = await call({ cible: undefined, subscription_id: id(200), titre: undefined, message: undefined }, headers);
  assert.equal(legacy.status, 200);
  assert.equal(state.sends[4].payload.title, 'Voix dans l’Est');
  assert.equal(state.sends[4].payload.body, 'Ceci est une notification Push de test.');
});
