const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function rows(photoVersion = 1, pdfVersion = photoVersion) {
    return [
        { code: 'photos_choristes', cache_version: photoVersion, cache_seconds: 12960000, updated_at: '2026-11-04T12:00:00Z' },
        { code: 'pdf_dai', cache_version: pdfVersion, cache_seconds: 12960000, updated_at: '2026-11-04T12:00:00Z' }
    ];
}

function versions(config) {
    return Array.from(config, row => row.cache_version);
}

function deferred() {
    let resolve;
    const promise = new Promise(finish => { resolve = finish; });
    return { promise, resolve };
}

function fixture() {
    let now = 1800000000000;
    let user = 'reader-a';
    let token = 'singer-token-a';
    let sessionError = null;
    let tableHandler = async () => ({ data: rows(), error: null });
    let edgeHandler = async () => ({ data: { config: rows(), can_refresh: false }, error: null });
    const tableCalls = [];
    const edgeCalls = [];
    const context = vm.createContext({
        TextEncoder,
        crypto: webcrypto,
        Date: class extends Date { static now() { return now; } },
        localStorage: { getItem: key => key === 'token' ? token : null },
        supabase: {
            auth: { getSession: async () => ({
                data: { session: user ? { user: { id: user }, access_token: `jwt-${user}` } : null },
                error: sessionError
            }) },
            from: table => ({ select: fields => ({ in: (column, codes) => {
                const call = { table, fields, column, codes: Array.from(codes) };
                tableCalls.push(call);
                return tableHandler(call, tableCalls.length);
            } }) }),
            functions: { invoke: async (name, options) => {
                const call = { name, body: JSON.parse(JSON.stringify(options.body)) };
                edgeCalls.push(call);
                return edgeHandler(call, edgeCalls.length);
            } }
        }
    });
    const source = fs.readFileSync(path.join(__dirname, '../src/services/StorageCacheConfigService.js'), 'utf8')
        .replace(/^import .*;\n/gm, '')
        .replace(/export default new StorageCacheConfigService\(\);/, 'globalThis.service = new StorageCacheConfigService();');
    vm.runInContext(source, context);
    return {
        service: context.service,
        tableCalls,
        edgeCalls,
        advance: milliseconds => { now += milliseconds; },
        user: value => { user = value; },
        token: value => { token = value; },
        sessionError: value => { sessionError = value; },
        table: handler => { tableHandler = handler; },
        edge: handler => { edgeHandler = handler; }
    };
}

test('Auth : lecture directe des métadonnées avec les droits RLS, sans Edge Function', async () => {
    const f = fixture();
    f.table(async () => ({ data: rows(7, 3), error: null }));
    assert.deepEqual(versions(await f.service.load({ strict: true })), [7, 3]);
    assert.deepEqual(f.tableCalls, [{
        table: 'storage_cache_config',
        fields: 'code, cache_version, cache_seconds, updated_at',
        column: 'code',
        codes: ['photos_choristes', 'pdf_dai']
    }]);
    assert.equal(f.edgeCalls.length, 0);
    assert.equal(f.service.canRefresh, false);
});

test('les lectures Auth simultanées sont dédupliquées et expirent après 60 secondes', async () => {
    const f = fixture();
    const started = deferred();
    const response = deferred();
    f.table(() => { started.resolve(); return response.promise; });
    const first = f.service.load({ strict: true });
    const second = f.service.load({ strict: true });
    await started.promise;
    response.resolve({ data: rows(2), error: null });
    const results = await Promise.all([first, second]);
    assert.deepEqual(results.map(versions), [[2, 2], [2, 2]]);
    assert.equal(f.tableCalls.length, 1);
    f.advance(59999);
    await f.service.load({ strict: true });
    assert.equal(f.tableCalls.length, 1);
    f.table(async () => ({ data: rows(3), error: null }));
    f.advance(1);
    assert.deepEqual(versions(await f.service.load({ strict: true })), [3, 3]);
    assert.equal(f.tableCalls.length, 2);
    await f.service.load({ force: true, strict: true });
    assert.equal(f.tableCalls.length, 3);
    assert.equal(f.edgeCalls.length, 0);
});

test('les configurations de deux comptes Auth restent séparées', async () => {
    const f = fixture();
    f.table(async (_call, count) => ({ data: rows(count === 1 ? 8 : 2), error: null }));
    assert.deepEqual(versions(await f.service.load()), [8, 8]);
    f.user('reader-b');
    assert.deepEqual(versions(await f.service.load()), [2, 2]);
    f.user('reader-a');
    assert.deepEqual(versions(await f.service.load()), [8, 8]);
    assert.equal(f.tableCalls.length, 2);
    assert.equal(f.edgeCalls.length, 0);
});

test('une réponse en retard et un ingest ancien ne diminuent pas les versions', async () => {
    const f = fixture();
    await f.service.ingest(rows(2));
    const started = deferred();
    const response = deferred();
    f.table(() => { started.resolve(); return response.promise; });
    const pending = f.service.load({ force: true, strict: true });
    await started.promise;
    await f.service.ingest(rows(5, 2));
    response.resolve({ data: rows(3, 4), error: null });
    assert.deepEqual(versions(await pending), [5, 4]);
    await f.service.ingest(rows(1, 3));
    assert.deepEqual(versions(await f.service.load({ strict: true })), [5, 4]);
});

test('un refus de lecture SQL utilise le repli local et reste visible en mode strict, sans contournement Edge', async () => {
    const f = fixture();
    f.table(async () => ({ data: null, error: { message: 'permission denied for table storage_cache_config' } }));
    assert.deepEqual(versions(await f.service.load()), [1, 1]);
    await assert.rejects(() => f.service.load({ strict: true }));
    assert.equal(f.tableCalls.length, 1);
    assert.equal(f.edgeCalls.length, 0);
    f.table(async () => ({ data: rows(9), error: null }));
    assert.deepEqual(versions(await f.service.load({ force: true, strict: true })), [9, 9]);
    assert.equal(f.tableCalls.length, 2);
});

test('une erreur de relecture conserve la dernière configuration valide', async () => {
    const f = fixture();
    await f.service.ingest(rows(6, 3));
    f.table(async () => ({ data: null, error: { message: 'database unavailable' } }));
    assert.deepEqual(versions(await f.service.load({ force: true })), [6, 3]);
    await assert.rejects(() => f.service.load({ strict: true }));
    assert.equal(f.edgeCalls.length, 0);
});

test('une lecture SQL incomplète est rejetée sans solliciter la fonction serveur', async () => {
    const f = fixture();
    f.table(async () => ({ data: rows(4).slice(0, 1), error: null }));
    await assert.rejects(() => f.service.load({ strict: true }), /incomplète/);
    assert.equal(f.edgeCalls.length, 0);
});

test('les tokens chanteurs restent validés côté serveur et isolés entre eux', async () => {
    const f = fixture();
    f.user(null);
    f.edge(async call => ({
        data: { config: rows(call.body.token === 'singer-token-a' ? 5 : 2), can_refresh: false },
        error: null
    }));
    assert.deepEqual(versions(await f.service.load({ strict: true })), [5, 5]);
    f.token('singer-token-b');
    assert.deepEqual(versions(await f.service.load({ strict: true })), [2, 2]);
    f.token('singer-token-a');
    assert.deepEqual(versions(await f.service.load({ strict: true })), [5, 5]);
    assert.deepEqual(f.edgeCalls, [
        { name: 'storage-cache-config', body: { token: 'singer-token-a' } },
        { name: 'storage-cache-config', body: { token: 'singer-token-b' } }
    ]);
    assert.equal(f.tableCalls.length, 0);
    assert.equal(f.service.canRefresh, false);
});

test('un token chanteur refusé ne déclenche aucune lecture SQL de secours', async () => {
    const f = fixture();
    f.user(null);
    f.edge(async () => ({ data: null, error: { context: { json: async () => ({ error: 'Accès au cache refusé.' }) } } }));
    await assert.rejects(() => f.service.load({ strict: true }), /Accès au cache refusé/);
    assert.deepEqual(versions(await f.service.load()), [1, 1]);
    assert.equal(f.tableCalls.length, 0);
    assert.equal(f.edgeCalls.length, 1);
});

test('sans session ni token, aucune lecture réseau ne contourne l’authentification', async () => {
    const f = fixture();
    f.user(null);
    f.token(null);
    await assert.rejects(() => f.service.load({ strict: true }), /Authentification nécessaire/);
    assert.deepEqual(versions(await f.service.load()), [1, 1]);
    assert.equal(f.tableCalls.length, 0);
    assert.equal(f.edgeCalls.length, 0);
});

test('une erreur de session ne bascule pas vers le token chanteur', async () => {
    const f = fixture();
    f.sessionError({ message: 'session unavailable' });
    await assert.rejects(() => f.service.load({ strict: true }), /vérifier la session/);
    assert.equal(f.tableCalls.length, 0);
    assert.equal(f.edgeCalls.length, 0);
});

test('la permission d’actualisation est vérifiée séparément sans remplacer les métadonnées SQL', async () => {
    const f = fixture();
    f.table(async () => ({ data: rows(8, 4), error: null }));
    await f.service.load({ strict: true });
    f.edge(async () => ({ data: { config: rows(1), can_refresh: true }, error: null }));
    assert.equal(await f.service.checkRefreshPermission(), true);
    assert.equal(f.service.canRefresh, true);
    assert.deepEqual(f.edgeCalls, [{ name: 'storage-cache-config', body: { action: 'read' } }]);
    assert.deepEqual(versions(await f.service.load({ strict: true })), [8, 4]);
    assert.equal(f.service.canRefresh, true);
    assert.equal(f.tableCalls.length, 1);
});

test('l’indisponibilité de la vérification des droits ne rend pas la configuration SQL indisponible', async () => {
    const f = fixture();
    f.table(async () => ({ data: rows(8), error: null }));
    await f.service.load({ strict: true });
    f.edge(async () => ({ data: null, error: { context: { json: async () => ({ error: 'Function not found' }) } } }));
    await assert.rejects(() => f.service.checkRefreshPermission());
    assert.equal(f.service.canRefresh, false);
    assert.deepEqual(versions(await f.service.load({ strict: true })), [8, 8]);
    assert.equal(f.tableCalls.length, 1);
    assert.equal(f.edgeCalls.length, 1);
});

test('un token chanteur ne peut pas solliciter les droits d’actualisation ni lancer une invalidation', async () => {
    const f = fixture();
    f.user(null);
    assert.equal(await f.service.checkRefreshPermission(), false);
    await assert.rejects(() => f.service.refresh('photos_choristes'), /administrateur/);
    assert.equal(f.tableCalls.length, 0);
    assert.equal(f.edgeCalls.length, 0);
});

test('l’actualisation utilise toujours le contrôle serveur et préserve l’autre catégorie', async () => {
    const f = fixture();
    await f.service.ingest(rows(3, 7));
    f.edge(async () => ({ data: { config: rows(4, 7), can_refresh: true }, error: null }));
    assert.deepEqual(versions(await f.service.refresh('photos_choristes')), [4, 7]);
    assert.deepEqual(f.edgeCalls, [{ name: 'storage-cache-config', body: { action: 'refresh', code: 'photos_choristes' } }]);
    assert.equal(f.service.canRefresh, true);
    await assert.rejects(() => f.service.refresh('other'), /inconnue/);
    assert.equal(f.edgeCalls.length, 1);
    assert.equal(f.tableCalls.length, 0);
});

test('un refus d’invalidation côté serveur conserve les versions précédentes', async () => {
    const f = fixture();
    await f.service.ingest(rows(3, 7));
    f.edge(async () => ({ data: null, error: { context: { json: async () => ({ error: 'Droits administrateur insuffisants.' }) } } }));
    await assert.rejects(() => f.service.refresh('photos_choristes'), /Droits administrateur insuffisants/);
    assert.deepEqual(versions(await f.service.load({ strict: true })), [3, 7]);
    assert.equal(f.tableCalls.length, 0);
    assert.equal(f.edgeCalls.length, 1);
});
