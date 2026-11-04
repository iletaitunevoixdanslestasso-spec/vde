// Run with Node.js 24: node --test supabase/functions/push-test/selection.test.cjs
// Exercises the real handler, authorization and repository against an in-memory
// PostgREST double. No credentials, Supabase calls or actual Push sends.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
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
  };
  class Query {
    constructor(table) { this.table = table; this.filters = []; }
    select(columns, options = {}) { this.columns = columns; this.options = options; return this; }
    eq(field, value) { this.filters.push([field, value, 'eq']); return this; }
    is(field, value) { this.filters.push([field, value, 'eq']); return this; }
    in(field, value) { this.filters.push([field, value, 'in']); return this; }
    order() { return this; }
    limit(value) { this.to = value - 1; return this; }
    range(from, to) { this.from = from; this.to = to; return this; }
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
        if (this.columns.includes('!inner')) {
          rows = rows.filter(row => state.chanteurs.some(singer => singer.id === row.chanteur_id));
        }
        rows.sort((a, b) => a.id.localeCompare(b.id));
        const count = rows.length;
        const from = this.from || 0;
        rows = rows.slice(from, Math.min(this.to === undefined ? Infinity : this.to + 1, from + state.pageLimit));
        // Respect selected fields so simulation cannot accidentally read keys.
        const columns = this.columns.split(',');
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
    auth: { getUser: async token => token === 'admin'
      ? { data: { user: { id: 'admin' } }, error: null }
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
    console: { error() {} }, Request, Response, Headers, URL, Uint8Array, atob, btoa,
    Deno: { env: { get: name => env[name] }, serve: fn => { handler = fn; } },
    createClient: () => db,
    webpush: {
      PushMessageError: class extends Error {}, importVapidKeys: async () => ({}),
      ApplicationServer: { new: async () => {
        state.signatures++;
        return { subscribe: subscription => ({ pushTextMessage: async payload => {
          state.sends.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) });
          if (state.failures.has(subscription.endpoint)) throw new Error('Push unavailable');
        } }) };
      } },
    },
  });
  for (const file of ['PushAuthorizationService.ts', 'PushSubscriptionRepository.ts', 'index.ts']) {
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
  assert.equal('subscriptions' in result.body, false);
  assert.equal(state.sends.length, 0);
  assert.equal(state.signatures, 0);
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

test('selected choristers with no subscriptions return zero sends without signing', async () => {
  const { state, call } = fixture();
  const result = await call({ simulation: false, confirmation: 'ENVOYER_LA_SELECTION', chanteur_ids: [third] });
  assert.equal(result.status, 200);
  assert.equal(result.body.nombre_appareils, 0);
  assert.equal(result.body.nombre_sans_abonnement, 1);
  assert.equal(result.body.acceptes, 0);
  assert.equal(result.body.echecs, 0);
  assert.equal(state.signatures, 0);
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
});
