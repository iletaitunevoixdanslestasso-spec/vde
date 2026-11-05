// Node.js 24 : node --test tests/trombinoscope-ca.test.cjs
// Exécute les deux vrais handlers avec un double PostgREST, sans appel Supabase.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const root = path.join(__dirname, '..');
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const saison = id(1), autreSaison = id(2), anne = id(10), bob = id(11), invisible = id(12);
const president = id(20), secretaire = id(21);
const plain = value => JSON.parse(JSON.stringify(value));

function load(file, names, dependencies) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
        .replace(/^import .*;\n/gm, '')
        .replace(/export default /g, 'globalThis.defaultExport = ')
        .replace(/export /g, '');
    const context = vm.createContext({ Request, Response, URL, console: { error() {} }, ...dependencies });
    vm.runInContext(stripTypeScriptTypes(source) + `\nglobalThis.loaded = {${names.join(',')}};`, context);
    return { ...context.loaded, defaultExport: context.defaultExport };
}

function fixture() {
    const person = (personId, nom, photo = null) => ({ id: personId, nom, prenom: nom, photo_path: photo });
    const photo = `chanteurs/${anne}/photo.jpg`;
    const state = {
        queries: [], signatures: [], rpc: [], caError: null,
        vue_trombinoscope_saison: [
            { saison_id: saison, saison: { id: saison, nom: '2026–2027' }, groupes: [{ id: id(30), nom: 'Groupe A' }],
                chanteurs: [person(anne, 'Anne', photo), { ...person(bob, 'Bob'), fonction_ca_id: secretaire, fonction_ca: 'Ancienne fonction' }],
                chef: person(anne, 'Anne', photo), accompagnant: null },
            { saison_id: autreSaison, saison: { id: autreSaison, nom: '2027–2028' }, groupes: [],
                chanteurs: [person(anne, 'Anne')], chef: null, accompagnant: null }
        ],
        ca_saison: [
            { saison_id: saison, chanteur_id: anne, fonction_ca_id: president, fonction: 'président' },
            { saison_id: saison, chanteur_id: invisible, fonction_ca_id: secretaire, fonction: 'secrétaire' },
            { saison_id: autreSaison, chanteur_id: anne, fonction_ca_id: secretaire, fonction: 'secrétaire' }
        ],
        acces: [{ token: 'chanteur-valid', actif: true, deleted_at: null, saison_chanteur_id: id(40) }],
        saison_chanteurs: [
            { id: id(40), saison_id: saison, chanteur_id: anne, groupe_id: id(30), deleted_at: null },
            { id: id(41), saison_id: saison, chanteur_id: bob, groupe_id: null, deleted_at: null },
            { id: id(42), saison_id: saison, chanteur_id: invisible, groupe_id: id(30), deleted_at: null }
        ],
        saisons: [{ id: saison, nom: '2026–2027' }],
        groupes: [{ id: id(30), nom: 'Groupe A', description: 'Groupe' }],
        membresVisibles: [{ id: anne, nom: 'Anne', prenom: 'Anne', photo }, { id: bob, nom: 'Bob', prenom: 'Bob', photo: null }]
    };
    class Query {
        constructor(table) { this.table = table; this.filters = []; }
        select(columns) { this.columns = columns; return this; }
        eq(field, value) { this.filters.push([field, value, 'eq']); return this; }
        is(field, value) { return this.eq(field, value); }
        in(field, values) { this.filters.push([field, values, 'in']); return this; }
        maybeSingle() { this.single = true; return this; }
        then(resolve, reject) {
            state.queries.push({ table: this.table, columns: this.columns, filters: plain(this.filters) });
            if (this.table === 'ca_saison' && state.caError) return Promise.resolve({ data: null, error: state.caError }).then(resolve, reject);
            const rows = state[this.table].filter(row => this.filters.every(([field, value, op]) =>
                op === 'in' ? value.includes(row[field]) : row[field] === value));
            return Promise.resolve({ data: this.single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        }
    }
    const db = {
        from: table => new Query(table),
        auth: { getUser: async jwt => ({ data: { user: jwt === 'admin-valid' ? { id: 'admin' } : jwt === 'anonymous-jwt' ? { id: 'anon', is_anonymous: true } : null }, error: null }) },
        rpc: async (name, args) => {
            state.rpc.push({ name, args: plain(args), queriesBefore: state.queries.length });
            if (name === 'trombi_token_autorise') return { data: args.p_token === 'chanteur-valid' && args.p_saison_id === saison, error: null };
            return args.p_token === 'chanteur-valid'
                ? { data: state.membresVisibles, error: null }
                : { data: null, error: { message: 'Token refusé' } };
        },
        storage: { from: bucket => ({ createSignedUrls: async (paths, duration) => {
            state.signatures.push({ bucket, paths: plain(paths), duration });
            return { data: paths.map(path => ({ path, signedUrl: `https://storage.test/${path}?token=signed` })), error: null };
        } }) }
    };
    const helper = load('supabase/functions/_shared/trombinoscope-ca.ts', ['chargerFonctionsCa', 'ajouterFonctionCa'], {});
    const dependencies = {
        ...helper,
        createClient: () => db,
        readStorageCacheConfig: async () => [{ code: 'photos_choristes', cache_version: 3 }],
        versionStorageUrl: url => url ? `${url}&v=3` : null,
        withSupabase: (_options, handler) => req => handler(req, { supabaseAdmin: db })
    };
    let seasonHandler;
    load('supabase/functions/trombinoscope-saison/index.ts', [], {
        ...dependencies,
        Deno: { env: { get: name => ({ SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'test-only', TROMBI_ALLOWED_ORIGINS: 'https://app.test' })[name] },
            serve: handler => { seasonHandler = handler; } }
    });
    const legacy = load('supabase/functions/get-trombinoscope/index.ts', [], dependencies).defaultExport;
    const request = (body, headers = {}) => new Request('https://api.test/trombi', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
    });
    return {
        state,
        main: (seasonId = saison, headers = { authorization: 'Bearer admin-valid' }) => seasonHandler(request({ saisonId: seasonId }, headers)),
        legacy: (token = 'chanteur-valid') => legacy.fetch(request({ token })),
        caQueries: () => state.queries.filter(q => q.table === 'ca_saison')
    };
}

test('accès admin : fonction CA de la saison, liste inchangée et photos signées conservées', async () => {
    const f = fixture();
    const response = await f.main();
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(data.chanteurs.map(c => c.id), [anne, bob]);
    assert.deepEqual(data.chanteurs.map(c => [c.fonction_ca_id, c.fonction_ca]), [[president, 'président'], [null, null]]);
    assert.equal(data.chef.fonction_ca, 'président');
    assert.equal(data.accompagnant, null);
    assert.equal(data.chanteurs[0].photo_url, `https://storage.test/chanteurs/${anne}/photo.jpg?token=signed&v=3`);
    assert.equal('photo_path' in data.chanteurs[0], false);
    assert.equal(f.state.signatures.length, 1);
    assert.equal(f.state.signatures[0].paths.length, 1);
    assert.equal(f.state.signatures[0].duration, 3600);
    assert.deepEqual(f.caQueries().map(q => q.filters), [[['saison_id', saison, 'eq']]]);
    assert.equal(f.state.vue_trombinoscope_saison[0].chanteurs[1].fonction_ca, 'Ancienne fonction');
});

test('accès chanteur : même enrichissement, après contrôle du token pour la saison exacte', async () => {
    const f = fixture();
    const response = await f.main(saison, { 'x-chanteur-token': 'chanteur-valid' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).chanteurs[0].fonction_ca_id, president);
    assert.deepEqual(f.state.rpc, [{ name: 'trombi_token_autorise', args: { p_token: 'chanteur-valid', p_saison_id: saison }, queriesBefore: 0 }]);
    assert.equal(f.caQueries().length, 1);
});

test('token invalide, autre saison et JWT anonyme : aucun accès aux vues ni aux photos', async () => {
    for (const [seasonId, headers] of [
        [saison, {}],
        [saison, { 'x-chanteur-token': 'bad' }],
        [autreSaison, { 'x-chanteur-token': 'chanteur-valid' }],
        [saison, { authorization: 'Bearer anonymous-jwt' }]
    ]) {
        const f = fixture();
        assert.equal((await f.main(seasonId, headers)).status, 403);
        assert.equal(f.state.queries.length, 0);
        assert.equal(f.state.signatures.length, 0);
    }
});

test('même choriste dans deux saisons : la fonction vient uniquement de la saison consultée', async () => {
    const f = fixture();
    const response = await f.main(autreSaison);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.chanteurs[0].fonction_ca_id, secretaire);
    assert.equal(data.chanteurs[0].fonction_ca, 'secrétaire');
    assert.deepEqual(f.caQueries()[0].filters, [['saison_id', autreSaison, 'eq']]);
});

test('CA vide ou affectation retirée : valeurs nulles, tous les choristes restent visibles', async () => {
    const f = fixture();
    f.state.ca_saison = [];
    const data = await (await f.main()).json();
    assert.equal(data.chanteurs.length, 2);
    assert.ok(data.chanteurs.every(c => c.fonction_ca_id === null && c.fonction_ca === null));
    assert.equal(data.chef.fonction_ca, null);
});

test('erreur de lecture CA : erreur serveur et aucune signature, pas de faux CA vide', async () => {
    const f = fixture();
    f.state.caError = { message: 'Vue indisponible' };
    const response = await f.main();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Erreur serveur du trombinoscope.' });
    assert.equal(f.state.signatures.length, 0);
});

test('ancien endpoint : enrichit uniquement les identités autorisées par le RPC et garde groupes/photos', async () => {
    const f = fixture();
    const response = await f.legacy();
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(data.chanteurs.map(c => c.id), [anne, bob]);
    assert.deepEqual(data.chanteurs.map(c => [c.fonction_ca_id, c.fonction_ca]), [[president, 'président'], [null, null]]);
    assert.equal(data.chanteurs[0].groupe_nom, 'Groupe A');
    assert.match(data.chanteurs[0].photo_url, /token=signed&v=3$/);
    assert.equal(f.state.rpc[0].queriesBefore, 0);
    assert.equal(f.caQueries().length, 1);
    assert.deepEqual(f.caQueries()[0].filters, [['saison_id', saison, 'eq']]);
});

test('ancien endpoint : refus RPC ou inscription supprimée empêchent la lecture CA', async () => {
    const f = fixture();
    assert.equal((await f.legacy('bad')).status, 403);
    assert.equal(f.caQueries().length, 0);
    f.state.saison_chanteurs[0].deleted_at = '2026-11-05';
    assert.equal((await f.legacy()).status, 403);
    assert.equal(f.caQueries().length, 0);
    assert.equal(f.state.signatures.length, 0);
});

test('ancien endpoint : erreur CA explicite et aucun appel Storage', async () => {
    const f = fixture();
    f.state.caError = { message: 'Vue indisponible' };
    const response = await f.legacy();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Impossible de charger les fonctions du CA' });
    assert.equal(f.state.signatures.length, 0);
});
