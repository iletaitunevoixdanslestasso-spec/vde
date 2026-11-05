const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/services/NotificationMessageService.js'), 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export class ', 'class ')
    .replace(/^export const notificationMessageService = .*;\n/gm, '');
const context = vm.createContext({});
vm.runInContext(source + '\nglobalThis.loaded = NotificationMessageService;', context);
const Service = context.loaded;
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DATE = '2026-11-05T12:00:00.000Z';
function fixture() {
    const calls = [];
    const repo = {
        lister: async (...args) => { calls.push(['list', ...args]); return { messages: [{ id: ID }], total: 1, non_lus: 1 }; },
        compterNonLus: async token => { calls.push(['count', token]); return { non_lus: 1 }; },
        definirLecture: async (token, id, lu) => { calls.push(['read', token, id, lu]); return { notification_id: id, lu_le: lu ? DATE : null, non_lus: lu ? 0 : 1 }; },
        listerAdmin: async (...args) => { calls.push(['admin', ...args]); return { messages: [], total: 0 }; }
    };
    return { service: new Service(repo), repo, calls };
}

test('lecture personnelle : token transmis, pagination validée, notification du compteur', async () => {
    const { service, calls } = fixture();
    const counters = [];
    const unsubscribe = service.subscribe('token-A', value => counters.push(value));
    await service.lister('token-A', 2, 20);
    assert.deepEqual(calls[0], ['list', 'token-A', 2, 20]);
    assert.deepEqual(counters, [1]);
    await service.definirLecture('token-A', ID.toUpperCase(), true);
    assert.deepEqual(calls[1], ['read', 'token-A', ID, true]);
    assert.deepEqual(counters, [1, 0]);
    unsubscribe();
    await service.definirLecture('token-A', ID, false);
    assert.deepEqual(counters, [1, 0]);
});

test('les compteurs et abonnements sont séparés par accès chanteur', async () => {
    const { service, repo } = fixture();
    const a = [], b = [];
    service.subscribe('token-A', count => a.push(count));
    service.subscribe('token-B', count => b.push(count));
    let resolve;
    let countCalls = 0;
    repo.compterNonLus = () => { countCalls++; return new Promise(done => { resolve = done; }); };
    const first = service.compterNonLus('token-A');
    const second = service.compterNonLus('token-A');
    assert.equal(countCalls, 1);
    resolve({ non_lus: 3 });
    assert.deepEqual(await Promise.all([first, second]), [3, 3]);
    assert.deepEqual(a, [3]);
    assert.deepEqual(b, []);
    await service.definirLecture('token-B', ID, true);
    assert.deepEqual(a, [3]);
    assert.deepEqual(b, [0]);
});

test('un ancien compteur revenu après une lecture confirmée ne rétablit pas le badge', async () => {
    const { service, repo } = fixture();
    let resolve;
    repo.compterNonLus = () => new Promise(done => { resolve = done; });
    const counts = [];
    service.subscribe('token-A', value => counts.push(value));
    const pending = service.compterNonLus('token-A');
    await service.definirLecture('token-A', ID, true);
    resolve({ non_lus: 1 });
    assert.equal(await pending, 0);
    assert.deepEqual(counts, [0]);
});

test('une erreur de sauvegarde ne diffuse jamais de fausse lecture réussie', async () => {
    const { service, repo } = fixture();
    const counts = [];
    service.subscribe('token-A', value => counts.push(value));
    repo.definirLecture = async () => { throw new Error('Accès refusé'); };
    await assert.rejects(() => service.definirLecture('token-A', ID, true), /Accès refusé/);
    assert.deepEqual(counts, []);
    repo.definirLecture = async () => ({ notification_id: ID, lu_le: null, non_lus: 0 });
    await assert.rejects(() => service.definirLecture('token-A', ID, true), /pas été confirmée/);
    assert.deepEqual(counts, []);
});

test('données/pagination invalides rejetées avant ou après le bon appel', async () => {
    const { service, repo, calls } = fixture();
    await assert.rejects(() => service.lister('', 0, 20));
    await assert.rejects(() => service.lister('token-A', -1, 20));
    await assert.rejects(() => service.listerAdmin(0, 51));
    await assert.rejects(() => service.definirLecture('token-A', 'bad', true));
    assert.equal(calls.length, 0);
    repo.compterNonLus = async () => ({ non_lus: -1 });
    await assert.rejects(() => service.compterNonLus('token-A'), /Compteur/);
    repo.lister = async () => ({ messages: {}, total: 0, non_lus: 0 });
    await assert.rejects(() => service.lister('token-A'), /Liste/);
    await service.listerAdmin(1, 20);
    assert.deepEqual(calls.at(-1), ['admin', 1, 20]);
});

test('une liste démarrée avant une lecture ne rétablit pas un ancien compteur', async () => {
    const { service, repo } = fixture();
    let resolve;
    const counters = [];
    service.subscribe('token-A', count => counters.push(count));
    repo.lister = () => new Promise(done => { resolve = done; });
    const pending = service.lister('token-A');
    await service.definirLecture('token-A', ID, true);
    resolve({ messages: [{ id: ID, lu_le: null }], total: 1, non_lus: 1 });
    assert.equal((await pending).non_lus, 0);
    assert.deepEqual(counters, [0]);
});
