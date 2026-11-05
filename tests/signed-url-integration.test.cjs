const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const origin = 'https://storage.test';

function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

function state() {
    return {
        now: 1800000000000,
        user: 'admin-a',
        singer: 'singer-a',
        version: 1,
        sequence: 0,
        stored: new Map(),
        signatures: [],
        requests: [],
        invokes: []
    };
}

function persistedUrls(s) {
    const saved = s.stored.get('vde-signed-download-urls-v2');
    return saved ? JSON.parse(saved).entries : [];
}

function signed(s, bucket, file, options = {}) {
    const token = [
        Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
        Buffer.from(JSON.stringify({
            url: `${bucket}/${file}`,
            iat: Math.floor(s.now / 1000),
            exp: Math.floor(s.now / 1000) + (options.seconds ?? 3600)
        })).toString('base64url'),
        `signature-${++s.sequence}`
    ].join('.');
    const url = new URL(`/storage/v1/object/sign/${bucket}/${file}`, origin);
    url.searchParams.set('token', token);
    if (options.download) url.searchParams.set('download', '');
    if (options.version) url.searchParams.set('v', String(options.version));
    return url.href;
}

function source(file) {
    return fs.readFileSync(path.join(root, file), 'utf8')
        .replace(/^import .*;\n/gm, '')
        .replace(/import\.meta\.env/g, `({ VITE_SUPABASE_URL: '${origin}', VITE_SUPABASE_ANON_KEY: 'anon-test' })`)
        .replace(/export (async )?function /g, '$1function ')
        .replace(/export const /g, 'const ')
        .replace(/export default class /g, 'class ');
}

function evaluate(context, file, tail) {
    const code = source(file).replace(/export default new (\w+)\(\);/, 'return new $1();');
    return vm.runInContext(`(function () {\n${code}\n${tail ?? ''}\n})()`, context, { filename: file });
}

function page(s) {
    const authListeners = [];
    const blobCache = new Map();
    const context = vm.createContext({
        URL, URLSearchParams, Request, Response, Headers, Blob, TextEncoder, atob,
        crypto: webcrypto,
        console: { ...console, error() {} },
        Date: class extends Date { static now() { return s.now; } },
        location: { origin: 'https://app.test' },
        localStorage: {
            getItem: key => key === 'token' ? s.singer : s.stored.get(key) ?? null,
            setItem: (key, value) => {
                if (key === 'token') s.singer = String(value);
                else s.stored.set(key, String(value));
            },
            removeItem: key => {
                if (key === 'token') s.singer = null;
                else s.stored.delete(key);
            }
        },
        caches: {
            open: async () => ({
                keys: async () => [...blobCache.keys()].map(url => new Request(url)),
                match: async request => blobCache.get(request.url ?? request)?.clone(),
                put: async (key, value) => blobCache.set(key, value.clone()),
                delete: async key => blobCache.delete(key.url ?? key)
            }),
            delete: async () => blobCache.clear()
        },
        supabase: {
            supabaseUrl: origin,
            auth: {
                getSession: async () => ({ data: { session: s.user ? {
                    user: { id: s.user }, access_token: `auth-${s.user}`
                } : null }, error: null }),
                onAuthStateChange: callback => { authListeners.push(callback); }
            },
            storage: { from: bucket => ({
                createSignedUrl: async (file, seconds) => {
                    s.signatures.push({ bucket, file, seconds });
                    if (s.signer) return s.signer(bucket, file, seconds);
                    return { data: { signedUrl: signed(s, bucket, file, { seconds }) }, error: null };
                },
                upload: async file => ({ data: { path: file }, error: null }),
                uploadToSignedUrl: async file => ({ data: { path: file }, error: null }),
                remove: async () => ({ data: [], error: null })
            }) },
            functions: { invoke: async (name, options) => {
                s.invokes.push({ name, options: JSON.parse(JSON.stringify(options)) });
                return s.invoke(name, options);
            } }
        },
        StorageCacheConfigService: {
            get: async code => ({ code, cache_version: s.version, cache_seconds: 12960000 }),
            ingest: async () => {}
        },
        fetch: async (url, options) => {
            const body = JSON.parse(options.body);
            s.requests.push({ url, body });
            const result = await s.fetch(url, body);
            return Response.json(result.body, { status: result.status ?? 200 });
        }
    });
    Object.assign(context, evaluate(context, 'src/services/storageCachePolicy.js',
        'return { categorieStorage, expirationSignee, STORAGE_CACHE_SECONDS, PRIVATE_DAI_CACHE_SECONDS, versionnerUrl };'));
    const cache = evaluate(context, 'src/services/SignedUrlCacheService.js');
    context.SignedUrlCacheService = cache;
    const photoSource = source('src/services/PhotoCacheService.js')
        .replace(/export default new PhotoCacheService\(\);/, 'return { service: new PhotoCacheService(), scopeUtilisateur, scopeTokenChanteur };');
    const photo = vm.runInContext(`(function () {\n${photoSource}\n})()`, context);
    context.PhotoCacheService = photo.service;
    context.scopeUtilisateur = photo.scopeUtilisateur;
    context.scopeTokenChanteur = photo.scopeTokenChanteur;
    const storage = evaluate(context, 'src/services/StorageService.js');
    const trombi = evaluate(context, 'src/services/TrombinoscopeService.js', 'return TrombinoscopeService;');
    return {
        storage, cache, photo: photo.service, trombi, context,
        event: (name, user = s.user) => {
            const session = user ? { user: { id: user } } : null;
            for (const listener of authListeners) listener(name, session);
        }
    };
}

test('les liens de photos, DAI, documents et paroles survivent au rechargement et à la réouverture', async () => {
    const s = state();
    let p = page(s);
    const files = [
        ['photos-chanteurs', 'chanteurs/a/photo.jpg'],
        ['chanteur-documents', 'a/droit_image.pdf'],
        ['referentiel-documents', 'adherent/reglement.pdf'],
        ['referentiel-documents', 'paroles/chanson.pdf']
    ];
    const first = await Promise.all(files.map(args => p.storage.createSignedUrl(...args)));
    assert.equal(s.signatures.length, files.length);
    s.now += 120000;
    p = page(s);
    const reloaded = await Promise.all(files.map(args => p.storage.createSignedUrl(...args)));
    assert.deepEqual(reloaded, first);
    assert.equal(s.signatures.length, files.length, 'aucune nouvelle signature après rechargement');
    s.now += 120000;
    p = page(s);
    const reopened = await Promise.all(files.map(args => p.storage.createSignedUrl(...args)));
    assert.deepEqual(reopened, first);
    assert.equal(s.signatures.length, files.length, 'aucune nouvelle signature après réouverture de l’application');
});

test('deux onglets déjà ouverts partagent les signatures directes dans les deux sens', async () => {
    const s = state();
    const a = page(s);
    const b = page(s);
    const photo = await a.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg');
    assert.equal(await b.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg'), photo);
    const document = await b.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf');
    assert.equal(await a.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf'), document);
    assert.equal(s.signatures.length, 2, 'chaque fichier est signé une seule fois pour les deux onglets');
});

test('les photos signées directement et celles du trombinoscope partagent aussi leurs URL entre onglets', async () => {
    const s = state();
    const a = page(s);
    const b = page(s);
    s.invoke = async () => ({ data: {
        saison: { id: 'saison-a' },
        chanteurs: ['a', 'b'].map(id => ({
            id,
            photo_url: signed(s, 'photos-chanteurs', `chanteurs/${id}/photo.jpg`, { version: 1 })
        }))
    }, error: null });
    const direct = await a.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg');
    const trombi = await b.trombi.getBySaisonId('saison-a');
    assert.equal(trombi.chanteurs[0].photo_url, direct, 'l’URL directe est réutilisée par la réponse métier autorisée');
    assert.equal(await a.storage.createSignedUrl('photos-chanteurs', 'chanteurs/b/photo.jpg'), trombi.chanteurs[1].photo_url,
        'le lien retourné par la fonction est réutilisé dans le service de signature directe');
    assert.equal(s.invokes.length, 1);
});

test('expiration, version, durée et compte imposent chacun une nouvelle signature', async () => {
    const s = state();
    let p = page(s);
    const first = await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg');
    s.version++;
    const versioned = await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg');
    assert.notEqual(versioned, first);
    const short = await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg', 60);
    assert.notEqual(short, versioned);
    s.user = 'admin-b';
    p = page(s);
    const anotherUser = await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg');
    assert.notEqual(anotherUser, versioned);
    s.now += 3571000;
    p = page(s);
    const renewed = await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg');
    assert.notEqual(renewed, anotherUser, 'renouvellement avant expiration, marge de 30 secondes');
    assert.equal(s.signatures.length, 5);
});

test('réponses métier fraîches et liens imbriqués stables, sans réutilisation après un refus serveur', async () => {
    const s = state();
    let call = 0;
    s.fetch = async () => ({ body: {
        workflow: `workflow-${++call}`,
        chanteurs: [{ photo_url: signed(s, 'photos-chanteurs', 'chanteurs/a/photo.jpg', { version: 1 }) }],
        data: [{ downloadUrl: signed(s, 'referentiel-documents', 'adherent/reglement.pdf') }],
        document: { url: signed(s, 'referentiel-documents', 'paroles/chanson.pdf') }
    } });
    const a = page(s);
    const b = page(s);
    const first = await a.storage.callChanteurFunction('documents', 'singer-a');
    const second = await b.storage.callChanteurFunction('documents', 'singer-a');
    assert.equal(second.workflow, 'workflow-2');
    assert.equal(second.chanteurs[0].photo_url, first.chanteurs[0].photo_url);
    assert.equal(second.data[0].downloadUrl, first.data[0].downloadUrl);
    assert.equal(second.document.url, first.document.url);
    assert.equal(s.requests.length, 2, 'la validation serveur est répétée');
    const anotherSinger = await a.storage.callChanteurFunction('documents', 'singer-b');
    assert.notEqual(anotherSinger.document.url, first.document.url, 'tokens métier isolés malgré la même session Auth');
    const reverse = await b.storage.callChanteurFunction('documents', 'singer-b');
    assert.equal(reverse.document.url, anotherSinger.document.url, 'réutilisation aussi de l’onglet A vers B pour le second accès');
    assert.equal(reverse.workflow, 'workflow-4', 'les métadonnées fraîches ne sont pas remplacées par le cache');
    s.fetch = async () => ({ status: 403, body: { error: 'Accès refusé' } });
    await assert.rejects(() => b.storage.callChanteurFunction('documents', 'singer-a'), /Accès refusé/);
});

test('DAI : lien conservé après rechargement, workflow frais, remplacement et absence respectés', async () => {
    const s = state();
    let file = 'a/droit_image.pdf';
    let call = 0;
    s.fetch = async () => ({ body: {
        url: file ? signed(s, 'chanteur-documents', file, { download: true, version: 1 }) : null,
        path: file,
        workflow: `état-${++call}`
    } });
    let p = page(s);
    const first = await p.storage.getDroitImageUrl('singer-a', 'get-chanteur-droit-image');
    p = page(s);
    assert.equal(await p.storage.getDroitImageUrl('singer-a', 'get-chanteur-droit-image'), first);
    assert.equal(await p.storage.getDroitImageUrl('singer-a', 'get-chanteur-droit-image'), first);
    assert.equal(call, 3, 'le cache de liens ne masque pas une nouvelle réponse serveur');
    file = 'a/droit_image-remplace.pdf';
    const replaced = await p.storage.getDroitImageUrl('singer-a', 'get-chanteur-droit-image');
    assert.notEqual(replaced, first);
    assert.match(new URL(replaced).pathname, /droit_image-remplace\.pdf$/);
    file = null;
    assert.equal(await p.storage.getDroitImageUrl('singer-a', 'get-chanteur-droit-image'), null);
});

test('les deux accès au trombinoscope réutilisent les photos sans éviter le contrôle serveur', async () => {
    for (const user of ['admin-a', null]) {
        const s = state();
        s.user = user;
        s.invoke = async () => ({ data: {
            saison: { id: 'saison-a' },
            chanteurs: [{ id: 'a', photo_url: signed(s, 'photos-chanteurs', 'chanteurs/a/photo.jpg', { version: 1 }) }]
        }, error: null });
        let p = page(s);
        const first = await p.trombi.getBySaisonId('saison-a');
        p = page(s);
        const second = await p.trombi.getBySaisonId('saison-a');
        assert.equal(second.chanteurs[0].photo_url, first.chanteurs[0].photo_url);
        assert.equal(s.invokes.length, 2);
        assert.equal(s.invokes[1].options.headers['x-chanteur-token'], user ? undefined : 'singer-a');
    }
});

test('upload, upload signé et suppression invalident les liens persistants des fichiers concernés', async () => {
    const s = state();
    let p = page(s);
    const document = await p.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf');
    const photo = await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg');
    const dai = await p.storage.createSignedUrl('chanteur-documents', 'a/droit_image.pdf');
    await p.storage.upload('referentiel-documents', 'adherent/reglement.pdf', new Blob(['replacement']));
    p = page(s);
    const replaced = await p.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf');
    assert.notEqual(replaced, document);
    assert.equal(await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg'), photo);
    await p.storage.uploadToSignedUrl('chanteur-documents', 'a/droit_image.pdf', 'upload-token', new Blob(['pdf'], { type: 'application/pdf' }));
    p = page(s);
    assert.notEqual(await p.storage.createSignedUrl('chanteur-documents', 'a/droit_image.pdf'), dai);
    await p.storage.remove('referentiel-documents', 'adherent/reglement.pdf');
    p = page(s);
    assert.notEqual(await p.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf'), replaced);
    await p.photo.invalidateChanteur('a');
    p = page(s);
    assert.notEqual(await p.storage.createSignedUrl('photos-chanteurs', 'chanteurs/a/photo.jpg'), photo);
});

test('un upload et un effacement invalident aussi les URL déjà connues dans un autre onglet ouvert', async () => {
    const s = state();
    const a = page(s);
    const b = page(s);
    const first = await a.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf');
    const unaffected = await a.storage.createSignedUrl('referentiel-documents', 'paroles/chanson.pdf');
    assert.equal(await b.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf'), first);
    await b.storage.upload('referentiel-documents', 'adherent/reglement.pdf', new Blob(['replacement']));
    const replaced = await a.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf');
    assert.notEqual(replaced, first, 'l’onglet déjà ouvert ne réutilise pas son ancienne entrée mémoire');
    assert.equal(await b.storage.createSignedUrl('referentiel-documents', 'paroles/chanson.pdf'), unaffected);
    assert.equal(await b.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf'), replaced);
    await a.photo.clearAll();
    assert.equal(persistedUrls(s).length, 0);
    assert.notEqual(await b.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf'), replaced);
});

test('INITIAL_SESSION et SIGNED_IN répété préservent les liens, SIGNED_OUT les purge', async () => {
    const s = state();
    let p = page(s);
    const first = await p.storage.createSignedUrl('referentiel-documents', 'paroles/chanson.pdf');
    p.event('INITIAL_SESSION');
    p.event('SIGNED_IN');
    p = page(s);
    assert.equal(await p.storage.createSignedUrl('referentiel-documents', 'paroles/chanson.pdf'), first);
    p.event('SIGNED_OUT', null);
    assert.equal(persistedUrls(s).length, 0);
    p = page(s);
    assert.notEqual(await p.storage.createSignedUrl('referentiel-documents', 'paroles/chanson.pdf'), first);
});

test('une signature et une réponse métier en vol ne repeuplent pas le cache après déconnexion', async () => {
    const s = state();
    let p = page(s);
    const signStarted = deferred();
    const signReply = deferred();
    s.signer = () => { signStarted.resolve(); return signReply.promise; };
    const signing = p.storage.createSignedUrl('referentiel-documents', 'paroles/chanson.pdf');
    await signStarted.promise;
    p.event('SIGNED_OUT', null);
    signReply.resolve({ data: { signedUrl: signed(s, 'referentiel-documents', 'paroles/chanson.pdf') }, error: null });
    assert.equal(await signing, null);
    assert.equal(persistedUrls(s).length, 0);
    const edgeStarted = deferred();
    const edgeReply = deferred();
    s.fetch = () => { edgeStarted.resolve(); return edgeReply.promise; };
    p = page(s);
    const request = p.storage.callChanteurFunction('documents', 'singer-a');
    await edgeStarted.promise;
    p.event('SIGNED_OUT', null);
    edgeReply.resolve({ body: { url: signed(s, 'referentiel-documents', 'adherent/reglement.pdf') } });
    await request;
    assert.equal(persistedUrls(s).length, 0);
});

test('un DAI en attente de configuration est abandonné si le cache est effacé avant la requête serveur', async () => {
    const s = state();
    const p = page(s);
    const configStarted = deferred();
    const configReply = deferred();
    p.context.StorageCacheConfigService.get = () => {
        configStarted.resolve();
        return configReply.promise;
    };
    const pending = p.storage.getDroitImageUrl('singer-a', 'get-chanteur-droit-image');
    await configStarted.promise;
    await p.photo.clearAll();
    configReply.resolve({ code: 'pdf_dai', cache_version: 1, cache_seconds: 12960000 });
    assert.equal(await pending, null);
    assert.equal(s.requests.length, 0, 'aucune requête métier ne démarre avec une ancienne génération');
    assert.equal(persistedUrls(s).length, 0, 'aucune URL ne repeuple le cache après effacement');
});

test('une signature en vol ne repeuple pas le cache après un upload dans un autre onglet, même initialement vide', async () => {
    const s = state();
    const a = page(s);
    const b = page(s);
    const started = deferred();
    const reply = deferred();
    s.signer = () => { started.resolve(); return reply.promise; };
    const pending = a.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf');
    await started.promise;
    assert.equal(persistedUrls(s).length, 0);
    await b.storage.upload('referentiel-documents', 'adherent/reglement.pdf', new Blob(['replacement']));
    reply.resolve({ data: { signedUrl: signed(s, 'referentiel-documents', 'adherent/reglement.pdf') }, error: null });
    assert.equal(await pending, null);
    assert.equal(persistedUrls(s).length, 0);
    assert.equal(a.cache.entries.size, 0);
});

test('une réponse DAI en vol ne repeuple pas le cache après effacement depuis un autre onglet vide', async () => {
    const s = state();
    const a = page(s);
    const b = page(s);
    const started = deferred();
    const reply = deferred();
    s.fetch = () => { started.resolve(); return reply.promise; };
    const pending = a.storage.getDroitImageUrl('singer-a', 'get-chanteur-droit-image');
    await started.promise;
    assert.equal(persistedUrls(s).length, 0);
    await b.photo.clearAll();
    reply.resolve({ body: { url: signed(s, 'chanteur-documents', 'a/droit_image.pdf', { download: true, version: 1 }) } });
    assert.equal(await pending, null);
    assert.equal(persistedUrls(s).length, 0);
    assert.equal(a.cache.entries.size, 0);
});

test('une invalidation intercalée juste avant la réutilisation bloque aussi une signature déjà reçue', async () => {
    const s = state();
    const a = page(s);
    const b = page(s);
    const reuse = a.cache.reuseUrls.bind(a.cache);
    let invalidations = 0;
    a.cache.reuseUrls = (value, scope, expectedGeneration) => {
        invalidations++;
        b.cache.invalidatePath('referentiel-documents', 'adherent/reglement.pdf');
        return reuse(value, scope, expectedGeneration);
    };
    assert.equal(await a.storage.createSignedUrl('referentiel-documents', 'adherent/reglement.pdf'), null);
    assert.equal(invalidations, 1, 'invalidation après le contrôle du service, avant celui du cache');
    assert.equal(s.signatures.length, 1);
    assert.equal(persistedUrls(s).length, 0, 'la nouvelle époque ne doit pas recevoir l’ancienne signature');
    assert.equal(a.cache.entries.size, 0);
});
