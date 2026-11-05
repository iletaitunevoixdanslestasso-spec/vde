const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const path = require('node:path');
const root = path.join(__dirname, '..');

function load(file, context) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
        .replace(/^import .*;\n/gm, '')
        .replace(/PhotoCacheService(?=\s*\{|\(\);)/g, 'PhotoCacheImplementation')
        .replace(/SignedUrlCacheService(?=\s*\{|\(\);)/g, 'SignedUrlCacheImplementation')
        .replace(/import\.meta\.env/g, '({})')
        .replace(/export (async )?function /g, '$1function ')
        .replace(/export const /g, 'const ')
        .replace(/export default new (\w+)\(\);/, 'globalThis.service = new $1();');
    vm.runInContext(source, context);
    return context.service;
}

function fixture() {
    let now = 1800000000000;
    let version = 1;
    let user = 'admin-1';
    let downloads = 0;
    let signatures = 0;
    let options;
    const cache = new Map();
    const signedStorage = new Map();
    const storage = {
        async match(key) { return cache.get(key.url || key)?.clone(); },
        async put(key, response) { cache.set(key.url || key, response.clone()); },
        async delete(key) { return cache.delete(key.url || key); },
        async keys() { return [...cache.keys()].map(url => new Request(url)); }
    };
    const ctx = vm.createContext({
        URL, URLSearchParams, Request, Response, Blob, TextEncoder, atob, crypto: webcrypto, console,
        Date: class extends Date { static now() { return now; } },
        location: { origin: 'https://app.test' },
        localStorage: { getItem: () => 'chorister-token' },
        sessionStorage: {
            getItem: key => signedStorage.get(key) ?? null,
            setItem: (key, value) => signedStorage.set(key, value),
            removeItem: key => signedStorage.delete(key)
        },
        caches: { open: async () => storage, delete: async () => cache.clear() },
        supabase: {
            supabaseUrl: 'https://storage.test',
            auth: { getSession: async () => ({ data: { session: { user: { id: user } } } }), onAuthStateChange: callback => { ctx.authEvent = callback; } },
            storage: { from: bucket => ({
                createSignedUrl: async (p, expiresIn) => {
                    signatures++;
                    const payload = Buffer.from(JSON.stringify({ iat: now / 1000, exp: now / 1000 + expiresIn })).toString('base64url');
                    return { data: { signedUrl: `https://storage.test/storage/v1/object/sign/${bucket}/${p}?token=header.${payload}.signature` } };
                },
                upload: async (p, file, opts) => { options = opts; return { data: { path: p } }; },
                uploadToSignedUrl: async (p, token, file, opts) => { options = opts; return { data: { path: p } }; }
            }) }
        },
        StorageCacheConfigService: { get: async code => ({ code, cache_version: version, cache_seconds: 12960000 }), ingest: async () => {} },
        fetch: async (url, opts) => { downloads++; options = opts; return new Response(new Blob(['file'], { type: url.includes('droit_image.pdf') ? 'application/pdf' : 'image/png' })); }
    });
    load('src/services/storageCachePolicy.js', ctx);
    ctx.SignedUrlCacheService = load('src/services/SignedUrlCacheService.js', ctx);
    const photo = load('src/services/PhotoCacheService.js', ctx);
    ctx.PhotoCacheService = photo;
    return { ctx, photo, cache, now: value => { now += value; }, version: value => { version = value; }, user: value => { user = value; }, counts: () => ({ downloads, signatures }), options: () => options };
}

const photoUrl = 'https://storage.test/storage/v1/object/sign/photos-chanteurs/chanteurs/one/photo.jpg?token=original&download=1';
test('photos: 150 jours, déduplication, changement de version et isolation des comptes', async () => {
    const f = fixture();
    await Promise.all([f.photo.getBlob(photoUrl), f.photo.getBlob(photoUrl)]);
    assert.equal(f.counts().downloads, 1);
    f.now(2 * 86400000);
    await f.photo.getBlob(photoUrl.replace('original', 'new-token'));
    assert.equal(f.counts().downloads, 1);
    f.version(2);
    await f.photo.getBlob(photoUrl);
    assert.equal(f.counts().downloads, 2);
    assert.equal(f.cache.size, 1, 'ancienne version évacuée');
    f.user('admin-2');
    await f.photo.getBlob(photoUrl);
    assert.equal(f.counts().downloads, 3);
    f.now(150 * 86400000);
    await f.photo.getBlob(photoUrl);
    assert.equal(f.counts().downloads, 4);
});

test('URLs: paramètres signés préservés, origines étrangères refusées, remplacement force reload', async () => {
    const f = fixture();
    assert.equal(await f.photo.getBlob(photoUrl.replace('storage.test', 'evil.test')), null);
    assert.equal(f.counts().downloads, 0);
    const versioned = vm.runInContext(`versionnerUrl(${JSON.stringify(photoUrl)}, 2)`, f.ctx);
    assert.equal(new URL(versioned).searchParams.get('token'), 'original');
    assert.equal(new URL(versioned).searchParams.get('download'), '1');
    await f.photo.getBlob(photoUrl);
    await f.photo.invalidatePath('photos-chanteurs', 'chanteurs/one/photo.jpg');
    await f.photo.getBlob(photoUrl);
    assert.equal(f.options().cache, 'reload');
});

test('DAI privé: réutilisation limitée à une heure et à l’expiration signée', async () => {
    const f = fixture();
    const token = btoa(JSON.stringify({ exp: 1800000000 + 1800 }));
    const url = `https://storage.test/storage/v1/object/sign/chanteur-documents/one/droit_image.pdf?token=x.${token}.x`;
    await f.photo.getBlob(url, 'pdf_dai');
    await f.photo.getBlob(url, 'pdf_dai');
    assert.equal(f.counts().downloads, 1);
    f.now(1800001);
    assert.equal(await f.photo.getBlob(url, 'pdf_dai'), null, 'lien expiré jamais retéléchargé');
    const fresh = url.replace(token, btoa(JSON.stringify({ exp: 1800000000 + 10000 })));
    await f.photo.getBlob(fresh, 'pdf_dai');
    f.now(3600001);
    await f.photo.getBlob(fresh, 'pdf_dai');
    assert.equal(f.counts().downloads, 3);
    assert.equal(await f.photo.getBlob('https://storage.test/storage/v1/object/sign/autres/doc.pdf', 'pdf_dai'), null);
});

test('signatures stables par compte/version et uploads ciblés (autres catégories inchangées)', async () => {
    const f = fixture();
    const service = load('src/services/StorageService.js', f.ctx);
    const [first, second] = await Promise.all([service.createSignedUrl('photos-chanteurs', 'a.jpg'), service.createSignedUrl('photos-chanteurs', 'a.jpg')]);
    assert.equal(first, second);
    assert.equal(f.counts().signatures, 1);
    f.version(2);
    await service.createSignedUrl('photos-chanteurs', 'a.jpg');
    assert.equal(f.counts().signatures, 2);
    f.user('admin-2');
    await service.createSignedUrl('photos-chanteurs', 'a.jpg');
    assert.equal(f.counts().signatures, 3);
    await service.upload('photos-chanteurs', 'a.jpg', new Blob(['x']));
    assert.equal(f.options().cacheControl, '12960000');
    await service.upload('autres', 'a.pdf', new Blob(['x']));
    assert.equal(f.options().cacheControl, undefined);
    await service.uploadToSignedUrl('chanteur-documents', 'one/droit_image.pdf', 'signed', new Blob(['x'], { type: 'application/pdf' }));
    assert.equal(f.options().cacheControl, '12960000');
    assert.equal(f.options().contentType, 'application/pdf');
});

test('liens DAI: deux tokens métier restent séparés même avec une session admin', async () => {
    const f = fixture();
    const service = load('src/services/StorageService.js', f.ctx);
    let calls = 0;
    service.callChanteurFunction = async (name, token) => { calls++; return { url: `https://storage.test/${token}` }; };
    assert.equal(await service.getDroitImageUrl('token-A', 'dai'), 'https://storage.test/token-A');
    assert.equal(await service.getDroitImageUrl('token-B', 'dai'), 'https://storage.test/token-B');
    await service.getDroitImageUrl('token-A', 'dai');
    assert.equal(calls, 3, 'chaque lecture DAI vérifie encore la réponse autorisée du serveur');
});

test('un événement SIGNED_IN répété ne vide pas les caches, la déconnexion oui', async () => {
    const f = fixture();
    const service = load('src/services/StorageService.js', f.ctx);
    f.ctx.authEvent('INITIAL_SESSION', { user: { id: 'admin-1' } });
    await f.photo.getBlob(photoUrl);
    await service.createSignedUrl('photos-chanteurs', 'a.jpg');
    f.ctx.authEvent('SIGNED_IN', { user: { id: 'admin-1' } });
    await f.photo.getBlob(photoUrl);
    await service.createSignedUrl('photos-chanteurs', 'a.jpg');
    assert.equal(f.counts().downloads, 1);
    assert.equal(f.counts().signatures, 1);
    f.ctx.authEvent('SIGNED_OUT', null);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.cache.size, 0);
});

test('une signature en vol ne repeuple pas le cache après remplacement', async () => {
    const f = fixture();
    const service = load('src/services/StorageService.js', f.ctx);
    let finish;
    let ready;
    const started = new Promise(resolve => { ready = resolve; });
    service.callChanteurFunction = async () => {
        ready();
        return new Promise(resolve => { finish = resolve; });
    };
    const pending = service.getDroitImageUrl('token-A', 'dai');
    await started;
    await service.invalidateFile('chanteur-documents', 'one/droit_image.pdf');
    finish({ url: 'https://storage.test/old' });
    assert.equal(await pending, null);
    service.callChanteurFunction = async () => ({ url: 'https://storage.test/new' });
    assert.equal(await service.getDroitImageUrl('token-A', 'dai'), 'https://storage.test/new');
});
