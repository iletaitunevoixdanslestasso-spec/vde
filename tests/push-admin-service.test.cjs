const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SEASON = '11111111-1111-4111-8111-111111111111';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const root = path.join(__dirname, '..');
function load(file, name, dependencies = {}) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
        .replace(/^import .*;\n/gm, '')
        .replace(/export class /g, 'class ')
        .replace(/^export const pushAdminService = .*;\n/gm, '');
    const context = vm.createContext({ console, Intl, ...dependencies });
    vm.runInContext(source + `\nglobalThis.loaded = ${name};`, context);
    return context.loaded;
}
const BaseResponse = load('src/core/framework/BaseResponse.js', 'BaseResponse');
const BaseService = load('src/services/BaseService.js', 'BaseService', { BaseResponse });
const SaisonService = load('src/services/SaisonService.js', 'SaisonService', { BaseService, BaseResponse, ChanteurRepository: class {} });
const SaisonChanteurService = load('src/services/SaisonChanteurService.js', 'SaisonChanteurService', {
    BaseService, BaseResponse, ChanteurRepository: class {}, SaisonChanteurRepository: class {}, SaisonChanteursValidator: class {}
});
const PushAdminService = load('src/services/PushAdminService.js', 'PushAdminService');
const plain = value => JSON.parse(JSON.stringify(value));

function fixture({ active = { id: SEASON, nom: '2026–2027' }, associations = [] } = {}) {
    const calls = [];
    const saison = new SaisonService({ findActive: async () => ({ data: active, error: null }) });
    const membership = new SaisonChanteurService();
    membership.repository = { findBySaison: async id => {
        assert.equal(id, SEASON);
        return { data: associations, error: null };
    } };
    const repository = { executer: async body => {
        calls.push(plain(body));
        return body.simulation ? { success: true, simulation: true, nombre_chanteurs: 2, nombre_appareils: 3, nombre_sans_abonnement: 0 }
            : { success: true, nombre_appareils: 3, acceptes: 3, echecs: 0 };
    } };
    return { service: new PushAdminService({ repository, saisonService: saison, saisonChanteurService: membership }), saison, membership, calls, repository };
}
const association = (id, nom, prenom) => ({ chanteur_id: id, saison_id: SEASON, chanteurs: { id, nom, prenom } });

test('liste depuis la saison active et saison_chanteurs, tri français Nom puis Prénom, doublons/null exclus', async () => {
    const f = fixture({ associations: [association(B, 'Émile', 'Zoé'), association(A, 'Émile', 'Alice'), association(B, 'Émile', 'Zoé'), { chanteurs: null }] });
    const result = plain(await f.service.getDestinataires());
    assert.deepEqual(result, { saison: { id: SEASON, nom: '2026–2027' }, chanteurs: [
        { id: A, nom: 'Émile', prenom: 'Alice' }, { id: B, nom: 'Émile', prenom: 'Zoé' }
    ] });
});

test('absence de saison active et erreurs de lecture bloquent la sélection', async () => {
    await assert.rejects(() => fixture({ active: null }).service.getDestinataires(), /Aucune saison active/);
    const f = fixture();
    f.membership.repository.findBySaison = async () => ({ error: { message: 'Lecture refusée' } });
    await assert.rejects(() => f.service.getDestinataires(), /Lecture refusée/);
    f.saison.repository.findActive = async () => ({ error: { message: 'Plusieurs saisons actives' } });
    await assert.rejects(() => f.service.getDestinataires(), /Plusieurs saisons/);
});

test('simulation et envoi utilisent uniquement les chanteurs explicitement choisis', async () => {
    const f = fixture();
    await f.service.simuler(' Titre ', ' Message ', [A, A.toUpperCase(), B], SEASON);
    await f.service.envoyer('Titre', 'Message', [B], SEASON);
    assert.deepEqual(f.calls[0], { titre: 'Titre', message: 'Message', cible: 'selection', saison_id: SEASON, chanteur_ids: [A, B], simulation: true });
    assert.deepEqual(f.calls[1], { titre: 'Titre', message: 'Message', cible: 'selection', saison_id: SEASON, chanteur_ids: [B], simulation: false, confirmation: 'ENVOYER_LA_SELECTION' });
});

test('sélection vide, UUID invalides et texte invalide ne déclenchent aucun appel', async () => {
    const f = fixture();
    for (const args of [['Titre', 'Message', [], SEASON], ['Titre', 'Message', [A], 'bad'], ['Titre', 'Message', ['bad'], SEASON], ['', 'Message', [A], SEASON], ['Titre', 'Message', null, SEASON]]) {
        await assert.rejects(() => f.service.simuler(...args));
    }
    assert.equal(f.calls.length, 0);
});

test('erreurs métier refusées et bilan partiel conservé sans annoncer une réception certaine', async () => {
    const f = fixture();
    f.repository.executer = async () => ({ success: false, error: 'Saison modifiée' });
    await assert.rejects(() => f.service.simuler('Titre', 'Message', [A], SEASON), /Saison modifiée/);
    await assert.rejects(() => f.service.envoyer('Titre', 'Message', [A], SEASON), /Saison modifiée/);
    f.repository.executer = async () => ({ success: false, nombre_appareils: 2, acceptes: 1, echecs: 1 });
    assert.equal((await f.service.envoyer('Titre', 'Message', [A], SEASON)).echecs, 1);
});

test('repository saison : active=true et deleted_at=null, sans masquer les saisons multiples', async () => {
    const chain = [];
    const query = {
        select(fields) { chain.push(['select', fields]); return this; },
        eq(field, value) { chain.push(['eq', field, value]); return this; },
        is(field, value) { chain.push(['is', field, value]); return this; },
        maybeSingle() { chain.push(['maybeSingle']); return { data: { id: SEASON } }; }
    };
    const SaisonRepository = load('src/repositories/SaisonRepository.js', 'SaisonRepository', { BaseRepository: class {
        constructor(table) { this.table = table; this.supabase = { from: name => { chain.push(['from', name]); return query; } }; }
    } });
    await new SaisonRepository().findActive();
    assert.deepEqual(chain, [['from', 'saisons'], ['select', '*'], ['eq', 'active', true], ['is', 'deleted_at', null], ['maybeSingle']]);
});

test('la liste de saison est paginée et ne tronque pas les inscrits à la première réponse', async () => {
    const f = fixture();
    const rows = [association(A, 'Durand', 'Alice'), association(B, 'Martin', 'Zoé')];
    const offsets = [];
    f.membership.repository.findBySaison = async (id, pagination) => {
        assert.equal(id, SEASON);
        offsets.push(pagination.offset);
        // Simule une limite serveur plus petite que la page demandée.
        return { data: rows.slice(pagination.offset, pagination.offset + 1), count: rows.length, error: null };
    };
    assert.equal((await f.service.getDestinataires()).chanteurs.length, 2);
    assert.deepEqual(offsets, [0, 1]);
    f.membership.repository.findBySaison = async () => ({ data: [], count: 2, error: null });
    await assert.rejects(() => f.service.getDestinataires(), /Lecture incomplète/);
});
