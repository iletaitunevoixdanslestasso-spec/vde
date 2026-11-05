const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ORIGIN = 'https://storage.test';
const STORAGE_KEY = 'vde-signed-download-urls-v2';
const EPOCH_KEY = 'vde-signed-download-urls-epoch-v1';
const START = 1800000000000;

function signed(object = 'photos-chanteurs/chanteurs/a/photo.jpg', issuedAt = START, lifetime = 3600, query = '') {
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'HS256' })}.${encode({ iat: issuedAt / 1000, exp: issuedAt / 1000 + lifetime })}.signature`;
    return `${ORIGIN}/storage/v1/object/sign/${object}?token=${token}${query}`;
}

function browser(storage = new Map(), options = {}) {
    let now = START;
    const localStorage = {
        getItem: key => {
            if (typeof options.readError === 'function' ? options.readError(key) : options.readError) throw new Error('denied');
            options.beforeGet?.(key);
            return storage.get(key) ?? null;
        },
        setItem: (key, value) => {
            if (typeof options.writeError === 'function' ? options.writeError(key) : options.writeError) throw new Error('quota');
            options.beforeSet?.(key, value);
            storage.set(key, value);
        },
        removeItem: key => { if (options.removeError) throw new Error('denied'); storage.delete(key); }
    };
    const ctx = vm.createContext({
        URL, URLSearchParams, atob,
        Date: class extends Date { static now() { return now; } },
        localStorage,
        supabase: { supabaseUrl: ORIGIN }
    });
    const load = (file, transform = source => source) => vm.runInContext(transform(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))
        .replace(/^import .*;\n/gm, '').replace(/export (async )?function /g, '$1function ').replace(/export const /g, 'const '), ctx);
    load('src/services/storageCachePolicy.js');
    load('src/services/SignedUrlCacheService.js', source => source.replace('export default new SignedUrlCacheService();', 'globalThis.cache = new SignedUrlCacheService();'));
    return { cache: ctx.cache, storage, advance: milliseconds => { now += milliseconds; } };
}

test('les URL photo et documents restent identiques après fermeture et réouverture de l’application', () => {
    const first = browser();
    const photo = signed(undefined, START, 3600, '&v=1');
    const pdf = signed('chanteur-documents/a/droit_image.pdf', START, 3600, '&download=true&v=1');
    const audio = signed('referentiel-documents/audio/voix.mp3');
    const response = { chanteurs: [{ photo_url: photo }], document: { downloadUrl: pdf }, audio, value: null };
    const original = first.cache.reuseUrls(response, 'admin-a');
    assert.notEqual(original, response);
    assert.notEqual(original.chanteurs, response.chanteurs);
    const reloaded = browser(first.storage);
    const fresh = { chanteurs: [{ photo_url: signed(undefined, START + 60000, 3600, '&v=1') }], document: { downloadUrl: signed('chanteur-documents/a/droit_image.pdf', START + 60000, 3600, '&download=true&v=1') }, audio: signed('referentiel-documents/audio/voix.mp3', START + 60000), value: null };
    assert.equal(reloaded.cache.reuseUrls(fresh, 'admin-a').chanteurs[0].photo_url, photo);
    assert.equal(reloaded.cache.reuseUrls(fresh, 'admin-a').document.downloadUrl, pdf);
    assert.equal(reloaded.cache.reuseUrls(fresh, 'admin-a').audio, audio);
    assert.equal(fresh.chanteurs[0].photo_url, signed(undefined, START + 60000, 3600, '&v=1'), 'la réponse reçue reste intacte');
});

test('la durée signée réelle et une borne plus courte ne sont jamais prolongées', () => {
    const f = browser();
    const url = signed(undefined, START, 120);
    f.cache.set('admin-a/photo', url, START + 3600000);
    assert.equal(f.cache.get('admin-a/photo').expiresAt, START + 120000);
    f.cache.set('admin-a/short', url, START + 60000);
    f.advance(30000);
    assert.equal(f.cache.get('admin-a/short'), null, 'marge de renouvellement de 30 secondes');
    assert.equal(f.cache.get('admin-a/photo').url, url);
    f.advance(60000);
    assert.equal(f.cache.get('admin-a/photo'), null);
    const fresh = signed(undefined, START + 90000, 120);
    assert.equal(f.cache.reuseUrls(fresh, 'admin-a'), fresh);
});

test('un lien nouvellement autorisé pour une durée plus courte ne reprend pas une ancienne signature plus longue', () => {
    const f = browser();
    const long = signed();
    const short = signed(undefined, START + 1000, 120);
    assert.equal(f.cache.reuseUrls(long, 'admin-a'), long);
    assert.equal(f.cache.reuseUrls(short, 'admin-a'), short);
});

test('les comptes, les chemins, les versions et les options de téléchargement restent séparés', () => {
    const f = browser();
    const first = signed(undefined, START, 3600, '&v=1');
    f.cache.reuseUrls(first, 'admin-a');
    const newer = signed(undefined, START + 60000, 3600, '&v=1');
    assert.equal(f.cache.reuseUrls(newer, 'admin-a'), first);
    assert.equal(f.cache.reuseUrls(newer, 'admin-b'), newer);
    assert.equal(f.cache.reuseUrls(newer, 'chanteur-token-hash'), newer);
    const version = signed(undefined, START + 60000, 3600, '&v=2');
    const download = signed(undefined, START + 60000, 3600, '&v=1&download=true');
    const other = signed('photos-chanteurs/chanteurs/b/photo.jpg', START + 60000, 3600, '&v=1');
    assert.equal(f.cache.reuseUrls(version, 'admin-a'), version);
    assert.equal(f.cache.reuseUrls(download, 'admin-a'), download);
    assert.equal(f.cache.reuseUrls(other, 'admin-a'), other);
    assert.equal(f.cache.reuseUrls(newer, null), newer);
});

test('les options de transformation sont préservées et seules les signatures changent', () => {
    const f = browser();
    const first = signed(undefined, START, 3600, '&width=120&height=80').replace('/object/sign/', '/render/image/sign/');
    const second = signed(undefined, START + 1000, 3600, '&height=80&width=120').replace('/object/sign/', '/render/image/sign/');
    assert.equal(f.cache.reuseUrls(first, 'admin-a'), first);
    assert.equal(f.cache.reuseUrls(second, 'admin-a'), first, 'ordre des options sans effet');
    const larger = signed(undefined, START + 1000, 3600, '&width=240&height=80').replace('/object/sign/', '/render/image/sign/');
    assert.equal(f.cache.reuseUrls(larger, 'admin-a'), larger);
});

test('les liens étrangers, publics, d’upload, invalides ou expirés ne sont pas mémorisés', () => {
    const f = browser();
    const url = signed();
    for (const unsafe of [url.replace(ORIGIN, 'https://evil.test'), url.replace('/object/sign/', '/object/upload/sign/'), url.replace('/object/sign/', '/object/public/'), `${ORIGIN}/storage/v1/object/sign/bucket/a?token=not-jwt`, `${ORIGIN}/storage/v1/object/sign/bucket/a?token=a.${Buffer.from('{}').toString('base64url')}.b`, signed(undefined, START - 7200000), `${url}&token=other`, 'javascript:alert(1)']) {
        assert.equal(f.cache.reuseUrls(unsafe, 'admin-a'), unsafe);
        f.cache.set('unsafe', unsafe, START + 3600000);
        assert.equal(f.cache.get('unsafe'), null);
    }
    assert.equal(f.storage.size, 0);
});

test('une copie persistée ne peut pas étendre l’expiration du token et les entrées étrangères sont ignorées', () => {
    const storage = new Map([[STORAGE_KEY, JSON.stringify({ version: 2, epoch: '', entries: [
        ['admin-a/photo', { url: signed(undefined, START, 120), expiresAt: START + 99999999 }],
        ['admin-a/foreign', { url: signed().replace(ORIGIN, 'https://evil.test'), expiresAt: START + 3600000 }]
    ] })]]);
    const f = browser(storage);
    assert.equal(f.cache.get('admin-a/photo').expiresAt, START + 120000);
    assert.equal(f.cache.get('admin-a/foreign'), null);
    const entry = f.cache.get('admin-a/photo');
    entry.expiresAt = START + 99999999;
    assert.equal(f.cache.get('admin-a/photo').expiresAt, START + 120000);
});

test('un contenu persistant corrompu ou un stockage bloqué conserve un fonctionnement en mémoire', () => {
    for (const options of [{}, { readError: true, writeError: true, removeError: true }, { writeError: true }]) {
        const f = browser(new Map([[STORAGE_KEY, 'broken JSON']]), options);
        const first = signed();
        const second = signed(undefined, START + 1000);
        assert.equal(f.cache.reuseUrls(first, 'admin-a'), first);
        assert.equal(f.cache.reuseUrls(second, 'admin-a'), first);
        f.cache.clearAll();
        assert.equal(f.cache.reuseUrls(second, 'admin-a'), second);
    }
});

test('l’invalidation d’un fichier supprime ses URL de toutes les variantes et identités', () => {
    const f = browser();
    const object = 'chanteur-documents/a/droit_image.pdf';
    const first = signed(object);
    f.cache.set('admin-a/direct', first);
    f.cache.reuseUrls(first, 'admin-a');
    f.cache.reuseUrls(`${first}&download=true`, 'chanteur-hash');
    const other = signed('chanteur-documents/b/droit_image.pdf');
    f.cache.reuseUrls(other, 'admin-a');
    f.cache.invalidatePath('chanteur-documents', 'a/droit_image.pdf');
    const reload = browser(f.storage);
    assert.equal(reload.cache.get('admin-a/direct'), null);
    const fresh = signed(object, START + 1000);
    assert.equal(reload.cache.reuseUrls(fresh, 'admin-a'), fresh);
    assert.equal(reload.cache.reuseUrls(signed('chanteur-documents/b/droit_image.pdf', START + 1000), 'admin-a'), other);
});

test('l’invalidation des photos d’un chanteur laisse ses documents et les autres chanteurs intacts', () => {
    const f = browser();
    const first = signed();
    const second = signed('photos-chanteurs/chanteurs/a/autre.jpg');
    const other = signed('photos-chanteurs/chanteurs/ab/photo.jpg');
    const pdf = signed('chanteur-documents/a/droit_image.pdf');
    [first, second, other, pdf].forEach(url => f.cache.reuseUrls(url, 'admin-a'));
    f.cache.invalidatePrefix('photos-chanteurs', 'chanteurs/a/');
    assert.equal(f.cache.reuseUrls(signed(undefined, START + 1000), 'admin-a'), signed(undefined, START + 1000));
    assert.equal(f.cache.reuseUrls(signed('photos-chanteurs/chanteurs/a/autre.jpg', START + 1000), 'admin-a'), signed('photos-chanteurs/chanteurs/a/autre.jpg', START + 1000));
    assert.equal(f.cache.reuseUrls(signed('photos-chanteurs/chanteurs/ab/photo.jpg', START + 1000), 'admin-a'), other);
    assert.equal(f.cache.reuseUrls(signed('chanteur-documents/a/droit_image.pdf', START + 1000), 'admin-a'), pdf);
});

test('le cache reste borné et la déconnexion efface aussi les entrées persistées', () => {
    const f = browser();
    for (let i = 0; i < 510; i++) f.cache.set(`admin-a/${i}`, signed(`documents/${i}.pdf`));
    assert.equal(JSON.parse(f.storage.get(STORAGE_KEY)).entries.length, 500);
    assert.equal(f.cache.get('admin-a/0'), null);
    assert.ok(f.cache.get('admin-a/509'));
    f.cache.clearAll();
    assert.equal(browser(f.storage).cache.get('admin-a/509'), null);
    assert.equal(f.storage.has(STORAGE_KEY), false);
});

test('la génération change aussi lors d’une invalidation sans entrée pour rejeter les réponses en vol', () => {
    const f = browser();
    const initial = f.cache.generation;
    f.cache.invalidatePath('documents', 'absent.pdf');
    assert.equal(f.cache.generation, initial + 1);
    f.cache.invalidatePrefix('photos-chanteurs', 'chanteurs/a/');
    assert.equal(f.cache.generation, initial + 2);
    f.cache.clearAll();
    assert.equal(f.cache.generation, initial + 3);
});

test('deux onglets déjà ouverts réutilisent leurs URL et ajoutent des fichiers dans les deux sens', () => {
    const storage = new Map();
    const first = browser(storage);
    const second = browser(storage);
    const photo = signed();
    const pdf = signed('chanteur-documents/a/droit_image.pdf');
    first.cache.reuseUrls(photo, 'admin-a');
    assert.equal(second.cache.reuseUrls(signed(undefined, START + 1000), 'admin-a'), photo);
    second.cache.reuseUrls(pdf, 'admin-a');
    assert.equal(first.cache.reuseUrls(signed('chanteur-documents/a/droit_image.pdf', START + 1000), 'admin-a'), pdf);
    first.cache.set('admin-a/direct-photo', photo);
    second.cache.set('admin-a/direct-document', pdf);
    assert.equal(first.cache.get('admin-a/direct-document').url, pdf);
    assert.equal(second.cache.get('admin-a/direct-photo').url, photo);
    assert.equal(second.cache.reuseUrls(signed(undefined, START + 2000), 'admin-b'), signed(undefined, START + 2000), 'aucun partage entre comptes');
});

test('les invalidations de chemin et de préfixe sont visibles immédiatement dans un autre onglet', () => {
    const first = browser();
    const second = browser(first.storage);
    const photo = signed();
    const pdf = signed('chanteur-documents/a/droit_image.pdf');
    first.cache.reuseUrls({ photo, pdf }, 'admin-a');
    const generation = second.cache.generation;
    first.cache.invalidatePath('chanteur-documents', 'a/droit_image.pdf');
    assert.notEqual(second.cache.generation, generation);
    const nextPdf = signed('chanteur-documents/a/droit_image.pdf', START + 1000);
    assert.equal(second.cache.reuseUrls(nextPdf, 'admin-a'), nextPdf);
    assert.equal(second.cache.reuseUrls(signed(undefined, START + 1000), 'admin-a'), photo, 'les autres chemins ne sont pas invalidés');
    const nextGeneration = first.cache.generation;
    second.cache.invalidatePrefix('photos-chanteurs', 'chanteurs/a/');
    assert.notEqual(first.cache.generation, nextGeneration);
    assert.equal(first.cache.reuseUrls(signed(undefined, START + 2000), 'admin-a'), signed(undefined, START + 2000));
    assert.equal(first.cache.reuseUrls(signed('chanteur-documents/a/droit_image.pdf', START + 2000), 'admin-a'), nextPdf);
});

test('la déconnexion conserve une barrière et un ancien document restauré ne ressuscite pas les liens', () => {
    const first = browser();
    const second = browser(first.storage);
    const photo = signed();
    first.cache.set('admin-a/photo', photo);
    const staleRecord = first.storage.get(STORAGE_KEY);
    const pendingGeneration = second.cache.generation;
    first.cache.clearAll();
    assert.equal(first.storage.has(STORAGE_KEY), false);
    assert.ok(first.storage.get(EPOCH_KEY));
    assert.notEqual(second.cache.generation, pendingGeneration);
    first.storage.set(STORAGE_KEY, staleRecord);
    assert.equal(second.cache.get('admin-a/photo'), null);
    assert.equal(browser(first.storage).cache.get('admin-a/photo'), null);
    second.cache.set('admin-a/late', photo, START + 3600000, pendingGeneration);
    assert.equal(browser(first.storage).cache.get('admin-a/late'), null);
});

test('une invalidation sans fichier existant rejette les réponses en vol d’un autre onglet', () => {
    const first = browser();
    const second = browser(first.storage);
    const pendingGeneration = second.cache.generation;
    first.cache.invalidatePath('chanteur-documents', 'a/droit_image.pdf');
    const pdf = signed('chanteur-documents/a/droit_image.pdf');
    second.cache.reuseUrls({ url: pdf }, 'admin-a', pendingGeneration);
    second.cache.set('admin-a/late-pdf', pdf, START + 3600000, pendingGeneration);
    assert.equal(browser(first.storage).cache.get('admin-a/late-pdf'), null);
    const saved = JSON.parse(first.storage.get(STORAGE_KEY));
    assert.equal(saved.entries.length, 0, 'la réponse en vol ne remplit pas le cache sous la nouvelle génération');
});

test('une écriture déjà commencée garde son ancien epoch si une autre fenêtre invalide juste avant l’écriture', () => {
    const options = {};
    const first = browser(new Map(), options);
    const second = browser(first.storage);
    first.cache.set('admin-a/photo', signed());
    let invalidate = true;
    options.beforeSet = key => {
        if (key === STORAGE_KEY && invalidate) {
            invalidate = false;
            second.cache.invalidatePath('photos-chanteurs', 'chanteurs/a/photo.jpg');
        }
    };
    first.cache.set('admin-a/unrelated', signed('documents/autre.pdf'));
    assert.equal(first.cache.get('admin-a/photo'), null);
    assert.equal(second.cache.get('admin-a/photo'), null);
    assert.equal(browser(first.storage).cache.get('admin-a/photo'), null);
});

test('une panne d’écriture des données garde les liens en mémoire mais respecte les invalidations partagées', () => {
    const options = {};
    const first = browser(new Map(), options);
    const second = browser(first.storage);
    const photo = signed();
    const pdf = signed('documents/a.pdf');
    first.cache.set('admin-a/photo', photo);
    first.cache.set('admin-a/document', pdf);
    options.writeError = key => key === STORAGE_KEY;
    first.cache.invalidatePath('photos-chanteurs', 'chanteurs/a/photo.jpg');
    assert.equal(first.cache.get('admin-a/photo'), null);
    assert.equal(first.cache.get('admin-a/document').url, pdf, 'repli local de la copie non invalidée');
    assert.equal(second.cache.get('admin-a/photo'), null, 'l’ancienne copie persistée porte un epoch périmé');
    first.cache.set('admin-a/memory', pdf);
    assert.equal(first.cache.get('admin-a/memory').url, pdf);
    second.cache.clearAll();
    assert.equal(first.cache.get('admin-a/memory'), null);
});

test('une panne de la barrière ne restaure pas les fichiers invalidés dans le repli mémoire', () => {
    const options = {};
    const f = browser(new Map(), options);
    f.cache.set('admin-a/photo', signed());
    options.writeError = key => key === EPOCH_KEY;
    options.removeError = true;
    f.cache.invalidatePath('photos-chanteurs', 'chanteurs/a/photo.jpg');
    assert.equal(f.cache.get('admin-a/photo'), null);
    f.cache.set('admin-a/document', signed('documents/a.pdf'));
    assert.ok(f.cache.get('admin-a/document'));
    f.cache.clearAll();
    assert.equal(f.cache.get('admin-a/photo'), null);
    assert.equal(f.cache.get('admin-a/document'), null);
});

test('le retour des lectures après une panne découvre les invalidations et refuse une ancienne génération', () => {
    const shared = new Map();
    const options = { readError: true };
    const first = browser(shared, options);
    const second = browser(shared);
    const pendingGeneration = first.cache.generation;
    second.cache.invalidatePrefix('photos-chanteurs', 'chanteurs/a/');
    options.readError = false;
    first.cache.set('admin-a/late', signed(), START + 3600000, pendingGeneration);
    assert.notEqual(first.cache.generation, pendingGeneration);
    assert.equal(first.cache.get('admin-a/late'), null);
});

test('une invalidation observée entre les deux lectures de la barrière ne renvoie pas l’ancienne URL', () => {
    const options = {};
    const first = browser(new Map(), options);
    const second = browser(first.storage);
    first.cache.set('admin-a/photo', signed());
    const generation = first.cache.generation;
    let reads = 0;
    options.beforeGet = key => {
        if (key === EPOCH_KEY && ++reads === 2) second.cache.clearAll();
    };
    assert.equal(first.cache.get('admin-a/photo'), null);
    assert.notEqual(first.cache.generation, generation);
});

test('une purge publiée après l’instantané d’une invalidation ne peut pas être annulée par ses fichiers conservés', () => {
    const first = browser();
    const second = browser(first.storage);
    first.cache.set('admin-a/photo', signed());
    first.cache.set('admin-a/document', signed('documents/a.pdf'));
    let purge = true;
    first.cache.invalidateMatching(object => {
        if (purge) {
            purge = false;
            second.cache.clearAll();
        }
        return object === 'photos-chanteurs/chanteurs/a/photo.jpg';
    });
    assert.equal(first.cache.get('admin-a/document'), null);
    assert.equal(second.cache.get('admin-a/document'), null);
    assert.equal(browser(first.storage).cache.get('admin-a/document'), null);
});

test('une invalidation détectée avant une écriture vide le repli mémoire même si la relecture suivante échoue', () => {
    const options = {};
    const first = browser(new Map(), options);
    const second = browser(first.storage);
    first.cache.set('admin-a/photo', signed());
    let reads = 0;
    options.beforeGet = key => {
        if (key === EPOCH_KEY && ++reads === 3) {
            second.cache.clearAll();
            options.readError = true;
        }
    };
    first.cache.set('admin-a/new', signed('documents/a.pdf'));
    assert.equal(first.cache.get('admin-a/photo'), null);
    assert.equal(first.cache.get('admin-a/new'), null);
});
