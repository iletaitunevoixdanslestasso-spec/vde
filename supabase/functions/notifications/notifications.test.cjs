// Node.js 24: node --test supabase/functions/notifications/notifications.test.cjs
// Real Edge Function handlers/repository, isolated PostgREST double: no remote calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const id = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const singerA = id(11);
const singerB = id(12);
const adminId = id(20);
const oldMessage = id(100);
const sharedMessage = id(101);
const foreignMessage = id(102);
const newestMessage = id(103);

function splitColumns(columns) {
  const result = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < columns.length; i++) {
    if (columns[i] === '(') depth++;
    if (columns[i] === ')') depth--;
    if (columns[i] === ',' && depth === 0) { result.push(columns.slice(start, i)); start = i + 1; }
  }
  result.push(columns.slice(start));
  return result;
}

function fixture(endpoint = 'notifications') {
  const state = {
    notification_messages: [oldMessage, sharedMessage, foreignMessage, newestMessage].map((messageId, i) => ({
      id: messageId, titre: `Message ${i}`, contenu: `Contenu ${i}`, auteur_nom: 'Marie Admin',
      auteur_id: adminId, saison_id: id(1),
      created_at: i === 0 ? '2026-11-04T12:00:00.000Z' : '2026-11-05T12:00:00.000Z',
      statut_push: i === 2 ? 'partiel' : 'termine', nombre_chanteurs: i === 1 ? 2 : 1,
      nombre_appareils: 2, acceptes: i === 2 ? 1 : 2, echecs: i === 2 ? 1 : 0,
    })),
    notification_destinataires: [
      { notification_id: oldMessage, chanteur_id: singerA, lu_le: null },
      { notification_id: sharedMessage, chanteur_id: singerA, lu_le: '2026-11-05T13:00:00.000Z' },
      { notification_id: sharedMessage, chanteur_id: singerB, lu_le: null },
      { notification_id: foreignMessage, chanteur_id: singerB, lu_le: null },
      { notification_id: newestMessage, chanteur_id: singerA, lu_le: null },
    ],
    queries: [], authTokens: [], profileTokens: [], mutations: [], failTables: new Set(),
    now: '2026-11-05T14:00:00.000Z',
  };
  const related = (row, relation) => relation === 'notification_destinataires'
    ? state.notification_destinataires.filter(item => item.notification_id === row.id)
    : state.notification_messages.filter(item => item.id === row.notification_id);
  const matches = (actual, expected, operator) => operator === 'in' ? expected.includes(actual)
    : operator === 'neq' ? actual !== expected : actual === expected;
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.orders = []; this.options = {}; }
    select(columns, options = {}) { this.columns = columns; this.options = options; return this; }
    eq(field, value) { this.filters.push([field, value, 'eq']); return this; }
    is(field, value) { this.filters.push([field, value, 'eq']); return this; }
    in(field, value) { this.filters.push([field, value, 'in']); return this; }
    not(field, operator, value) { this.filters.push([field, value, 'neq']); return this; }
    update(values) { this.values = values; return this; }
    order(field, options = {}) { this.orders.push([field, options]); return this; }
    range(from, to) { this.from = from; this.to = to; return this; }
    limit(limit) { this.to = limit - 1; return this; }
    maybeSingle() { this.expectSingle = true; return this; }
    single() { this.expectSingle = true; return this; }
    relationRows(row, relation) {
      return related(row, relation).filter(item => this.filters.every(([field, value, operator]) => {
        if (!field.startsWith(`${relation}.`)) return true;
        return matches(item[field.slice(relation.length + 1)], value, operator);
      }));
    }
    projection(row, columns = this.columns) {
      const output = {};
      for (const column of splitColumns(columns)) {
        const nested = /^([^()]+)\((.*)\)$/.exec(column);
        if (nested) {
          const relation = nested[1].split(':').at(-1).split('!')[0];
          const alias = nested[1].includes(':') ? nested[1].split(':')[0] : relation;
          const items = this.relationRows(row, relation).map(item => this.projection(item, nested[2]));
          output[alias] = relation === 'notification_messages' ? items[0] ?? null : items;
        } else if (column === '*') Object.assign(output, row);
        else output[column] = row[column];
      }
      return output;
    }
    then(resolve, reject) {
      try {
        state.queries.push({ table: this.table, columns: this.columns, filters: this.filters, values: this.values });
        if (state.failTables.has(this.table)) {
          return Promise.resolve({ data: null, count: null, error: { message: 'private backend detail' } }).then(resolve, reject);
        }
        let rows = state[this.table].filter(row => this.filters.every(([field, value, operator]) => {
          if (!field.includes('.')) return matches(row[field], value, operator);
          const [relation, relatedField] = field.split('.');
          return related(row, relation).some(item => matches(item[relatedField], value, operator));
        }));
        for (const [field, options] of [...this.orders].reverse()) {
          rows.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (options.ascending === false ? -1 : 1));
        }
        const count = rows.length;
        rows = rows.slice(this.from ?? 0, this.to === undefined ? undefined : this.to + 1);
        if (this.values) for (const row of rows) {
          state.mutations.push({ table: this.table, before: { ...row }, values: { ...this.values } });
          Object.assign(row, this.values);
        }
        const data = this.options.head ? null : rows.map(row => this.projection(row));
        return Promise.resolve({ data: this.expectSingle ? data?.[0] ?? null : data,
          count: this.options.count === 'exact' ? count : null, error: null }).then(resolve, reject);
      } catch (error) { return Promise.reject(error).then(resolve, reject); }
    }
  }
  const db = {
    from: table => new Query(table),
    rpc: async (name, parameters) => {
      assert.equal(name, 'get_mon_profil');
      state.profileTokens.push(parameters.p_token);
      const chanteurId = parameters.p_token === 'token-a' ? singerA : parameters.p_token === 'token-b' ? singerB : null;
      return { data: chanteurId ? [{ id: chanteurId }] : [], error: null };
    },
    auth: { getUser: async token => {
      state.authTokens.push(token);
      const user = token === 'admin-session' ? { id: adminId, user_metadata: { full_name: 'Marie Admin' }, email: 'admin@example.test' }
        : token === 'reader-session' ? { id: singerA } : null;
      return { data: { user }, error: user ? null : { message: 'invalid' } };
    } },
  };
  const env = { SUPABASE_URL: 'https://supabase.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake',
    PUSH_TEST_SECRET: 'manual-secret', PUSH_ADMIN_USER_IDS: adminId };
  class ServerDate extends Date {
    constructor(...args) { super(...(args.length ? args : [state.now])); }
    static now() { return new Date(state.now).getTime(); }
  }
  let handler;
  const context = vm.createContext({
    Request, Response, Headers, URL, crypto, Date: ServerDate,
    console: { error() {} },
    Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } },
    createClient: () => db,
  });
  const root = path.join(__dirname, '..');
  const load = file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const exports = [...source.matchAll(/^export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)/gm)].map(match => match[1]);
    const stripped = source.replace(/^import[\s\S]*?from ["'][^"']+["'];\n/gm, '').replace(/^export /gm, '');
    const runtime = stripTypeScriptTypes(stripped, { mode: 'transform' });
    const result = vm.runInContext(`(function() {${runtime}\nreturn {${exports.join(',')}};})()`, context);
    Object.assign(context, result);
  };
  load('_shared/chanteur.ts');
  load('push-test/PushAuthorizationService.ts');
  load('_shared/notification-messages.ts');
  load(`${endpoint}/index.ts`);
  const call = async (body = {}, headers = {}, method = 'POST') => {
    const response = await handler(new Request('https://test.invalid', {
      method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    }));
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  return { state, call };
}

test('singer history and unread count follow only the verified business token, across seasons', async () => {
  const { state, call } = fixture();
  // An old season stays in personal history, independently of active-season membership.
  state.notification_messages[0].saison_id = id(999);
  const response = await call({ token: 'token-a', action: 'list', chanteur_id: singerB });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.messages.map(item => item.id), [newestMessage, sharedMessage, oldMessage]);
  assert.equal(response.body.total, 3);
  assert.equal(response.body.non_lus, 2);
  assert.equal(response.body.messages[1].lu_le, '2026-11-05T13:00:00.000Z');
  assert.deepEqual(Object.keys(response.body.messages[0]).sort(), ['auteur_nom', 'contenu', 'created_at', 'id', 'lu_le', 'titre']);
  assert.equal((await call({ token: 'token-b', action: 'count', chanteur_id: singerA })).body.non_lus, 2);
  assert.deepEqual(state.profileTokens, ['token-a', 'token-b']);
  assert.equal(state.mutations.length, 0);
});

test('history uses stable newest-first pagination without exposing other recipients', async () => {
  const { call } = fixture();
  const first = await call({ token: 'token-a', action: 'list', page: 0, page_size: 1 });
  const second = await call({ token: 'token-a', action: 'list', page: 1, page_size: 1 });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.messages[0].id, newestMessage);
  assert.equal(second.body.messages[0].id, sharedMessage);
  assert.equal(second.body.messages[0].lu_le, '2026-11-05T13:00:00.000Z');
  assert.equal(second.body.total, 3);
  assert.equal(second.body.non_lus, 2);
  assert.equal(second.body.page, 1);
  assert.equal(second.body.page_size, 1);
});

test('personal and admin history return the full long Unicode message with its original line breaks', async () => {
  const contenu = `Bonjour aux choristes 👨‍👩‍👧‍👦 !\n\n${'Partitions et programme de la répétition 🎶\n'.repeat(40)}\nÀ jeudi !`;
  assert(contenu.length > 500);
  for (const endpoint of ['notifications', 'notifications-admin']) {
    const { state, call } = fixture(endpoint);
    state.notification_messages.find(message => message.id === newestMessage).contenu = contenu;
    const response = endpoint === 'notifications'
      ? await call({ token: 'token-a', action: 'list' })
      : await call({}, { authorization: 'Bearer admin-session' });
    assert.equal(response.status, 200);
    assert.equal(response.body.messages.find(message => message.id === newestMessage).contenu, contenu);
    assert.equal(state.mutations.length, 0);
  }
});

test('read and unread change only the token owner, preserve first-read time and ignore client timestamps', async () => {
  const { state, call } = fixture();
  const read = await call({ token: 'token-a', action: 'read', notification_id: newestMessage,
    chanteur_id: singerB, lu: true, lu_le: '2000-01-01T00:00:00Z' });
  assert.equal(read.status, 200);
  assert.equal(read.body.notification_id, newestMessage);
  assert.equal(read.body.lu_le, state.now);
  assert.equal(read.body.non_lus, 1);
  state.now = '2026-11-06T14:00:00.000Z';
  const again = await call({ token: 'token-a', action: 'read', notification_id: newestMessage, lu: true });
  assert.equal(again.status, 200);
  assert.equal(again.body.lu_le, read.body.lu_le);
  const shared = await call({ token: 'token-b', action: 'read', notification_id: sharedMessage, lu: true });
  assert.equal(shared.status, 200);
  assert.equal(state.notification_destinataires.find(row => row.notification_id === sharedMessage && row.chanteur_id === singerA).lu_le,
    '2026-11-05T13:00:00.000Z');
  const unread = await call({ token: 'token-a', action: 'read', notification_id: newestMessage, lu: false });
  assert.equal(unread.status, 200);
  assert.equal(unread.body.lu_le, null);
  assert.equal(unread.body.non_lus, 2);
});

test('a known message ID is insufficient to read or change another singer receipt', async () => {
  const { state, call } = fixture();
  for (const notificationId of [foreignMessage, id(999)]) {
    for (const lu of [true, false]) {
      const response = await call({ token: 'token-a', action: 'read', notification_id: notificationId,
        chanteur_id: singerB, lu });
      assert.equal(response.status, 404);
    }
  }
  assert.equal(state.mutations.length, 0);
  assert.equal(state.notification_destinataires.find(row => row.notification_id === foreignMessage).lu_le, null);
});

test('invalid token, action, read ID and pagination never cause message writes', async () => {
  const { state, call } = fixture();
  assert.equal((await call({ token: 'invalid', action: 'list' })).status, 401);
  for (const body of [
    { action: 'list' }, { token: '', action: 'count' }, { token: 'token-a', action: 'other' },
    { token: 'token-a', action: 'read', notification_id: 'bad', lu: true },
    { token: 'token-a', action: 'read', notification_id: newestMessage, lu: 'true' },
    ...[-1, 0.5, '1'].map(page => ({ token: 'token-a', action: 'list', page })),
    ...[0, 51, 1.5, '20'].map(page_size => ({ token: 'token-a', action: 'list', page_size })),
  ]) assert.equal((await call(body)).status, 400);
  assert.equal(state.mutations.length, 0);
});

test('admin history requires a verified allowlisted JWT; a manual Push secret grants no history access', async () => {
  const { state, call } = fixture('notifications-admin');
  assert.equal((await call({})).status, 401);
  assert([401, 403].includes((await call({}, { 'x-push-test-secret': 'manual-secret' })).status));
  assert.equal((await call({}, { authorization: 'Bearer reader-session' })).status, 403);
  assert.equal((await call({}, { authorization: 'Bearer expired-session' })).status, 401);
  assert.equal(state.queries.length, 0);
  assert.equal(state.mutations.length, 0);
});

test('admin history returns saved author, date, Push result and totals with stable pagination', async () => {
  const { state, call } = fixture('notifications-admin');
  const response = await call({ page: 1, page_size: 2, auteur_nom: 'Injected author', created_at: '2000-01-01' },
    { authorization: 'Bearer admin-session' });
  assert.equal(response.status, 200);
  assert.equal(response.body.total, 4);
  assert.deepEqual(response.body.messages.map(message => message.id), [sharedMessage, oldMessage]);
  assert.equal(response.body.messages[0].auteur_nom, 'Marie Admin');
  assert.equal(response.body.messages[0].created_at, '2026-11-05T12:00:00.000Z');
  for (const message of response.body.messages) {
    assert.equal(message.saison_id, id(1));
    assert.equal(message.statut_push, 'termine');
    assert.equal(message.nombre_appareils, 2);
    for (const privateField of ['auteur_id', 'notification_destinataires', 'chanteur_id', 'endpoint', 'p256dh', 'auth']) {
      assert.equal(privateField in message, false);
    }
  }
  assert.deepEqual(state.authTokens, ['admin-session']);
  assert.equal(state.mutations.length, 0);
});

test('transport and storage errors produce controlled responses without leaking backend details', async () => {
  const { state, call } = fixture();
  assert.equal((await call({}, {}, 'OPTIONS')).status, 204);
  assert.equal((await call({}, {}, 'GET')).status, 405);
  state.failTables.add('notification_messages');
  const response = await call({ token: 'token-a', action: 'list' });
  assert(response.status >= 500);
  assert.equal(JSON.stringify(response.body).includes('private backend detail'), false);
});
