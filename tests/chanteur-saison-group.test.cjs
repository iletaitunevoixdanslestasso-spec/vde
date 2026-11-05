/* global require, __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const SEASON = '11111111-1111-4111-8111-111111111111';
const SINGER = '22222222-2222-4222-8222-222222222222';
const MEMBERSHIP = '33333333-3333-4333-8333-333333333333';
const GROUP = '44444444-4444-4444-8444-444444444444';
const FUNCTION = '55555555-5555-4555-8555-555555555555';
const WARNING = 'Le choriste a été enregistré sans groupe.';

function load(file, name, dependencies = {}) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
        .replace(/^import .*;\n/gm, '')
        .replace(/export class /g, 'class ')
        .replace(/export const /g, 'const ');
    const context = vm.createContext({ console, ...dependencies });
    vm.runInContext(source + `\nglobalThis.loaded = ${name};`, context);
    return context.loaded;
}

const plain = value => JSON.parse(JSON.stringify(value));
const BaseResponse = load('src/core/framework/BaseResponse.js', 'BaseResponse');
const BaseService = load('src/services/BaseService.js', 'BaseService', { BaseResponse });
const BaseController = load('src/controllers/BaseController.js', 'BaseController');
const BaseValidator = load('src/validators/BaseValidator.js', 'BaseValidator');
const BaseMapper = load('src/mappers/BaseMapper.js', 'BaseMapper');
const ChanteurSaisonService = load('src/services/ChanteurSaisonService.js', 'ChanteurSaisonService', {
    BaseService,
    BaseResponse,
    ChanteurRepository: class {},
    GroupeRepository: class {},
    ReferentielFonctionCaRepository: class {}
});
const ChanteursSaisonController = load('src/controllers/ChanteursSaisonController.js', 'ChanteursSaisonController', {
    BaseController,
    AccesController: class {},
    MailService: class {}
});
const config = load('src/config/entities/chanteursSaison.config.js', 'ChanteursSaisonConfig', {
    createEntityConfig: options => options,
    ChanteursSaisonController,
    ChanteurSaisonService,
    ChanteurSaisonMapper: class {},
    ChanteurSaisonRepository: class {}
});

function fixture({ error = null, exists = false } = {}) {
    const writes = [];
    const current = {
        id: MEMBERSHIP,
        saison_id: SEASON,
        chanteur_id: SINGER,
        groupe_id: GROUP,
        fonction_ca_id: FUNCTION
    };
    const repository = {
        async exists(saisonId, chanteurId) {
            assert.equal(saisonId, SEASON);
            assert.equal(chanteurId, SINGER);
            return { data: exists ? { id: MEMBERSHIP } : null, error: null };
        },
        async insert(data) {
            writes.push({ operation: 'insert', data: plain(data) });
            return error
                ? { data: null, error: { message: error } }
                : { data: { id: MEMBERSHIP, ...data }, error: null };
        },
        async update(id, data) {
            assert.equal(id, MEMBERSHIP);
            writes.push({ operation: 'update', data: plain(data) });
            return error
                ? { data: null, error: { message: error } }
                : { data: { ...current, ...data }, error: null };
        }
    };
    const service = new ChanteurSaisonService(repository, new BaseValidator(config.columns));
    const controller = new ChanteursSaisonController(service);
    controller.initialize({ saisonId: SEASON });
    return { service, controller, writes };
}

test('le groupe est facultatif, affiché clairement et déclaré comme UUID', () => {
    const group = config.columns.find(column => column.field === 'groupe_id');
    assert.equal(group.required, false);
    assert.equal(group.dbType, 'uuid');
    assert.equal(group.emptyOptionLabel, 'Aucun groupe');
    assert.equal(group.render(null, { groupes: null }), 'Sans groupe');
    assert.equal(group.render(GROUP, { groupes: { nom: 'Paris' } }), 'Paris');
    const validator = new BaseValidator(config.columns);
    assert.equal(validator.validate({ chanteur_id: SINGER, groupe_id: '' }).valid, true);
    const mapper = new BaseMapper(config.columns);
    assert.equal(mapper.toDb({ groupe_id: '' }).groupe_id, null);
    assert.equal(mapper.toDb({ groupe_id: GROUP }).groupe_id, GROUP);
});

test('création sans groupe : chaîne vide, null et champ absent deviennent null', async () => {
    for (const group of ['', null, undefined]) {
        const f = fixture();
        const form = { chanteur_id: SINGER, fonction_ca_id: FUNCTION };
        if (group !== undefined) form.groupe_id = group;
        const saved = [];
        const result = await f.controller.save(form, data => saved.push(plain(data)));
        assert.equal(result.success, true);
        assert.equal(result.warning, WARNING);
        assert.equal(result.data.groupe_id, null);
        assert.deepEqual(f.writes, [{ operation: 'insert', data: {
            saison_id: SEASON,
            chanteur_id: SINGER,
            groupe_id: null,
            fonction_ca_id: FUNCTION
        } }]);
        assert.equal(saved.length, 1);
        assert.equal(saved[0].groupe_id, null);
    }
});

test('l’ajout direct normalise aussi un groupe absent et conserve un groupe choisi', async () => {
    for (const group of ['', null, undefined, GROUP]) {
        const f = fixture();
        const result = await f.service.addChanteur(SINGER, group);
        assert.equal(result.success, true);
        assert.equal(f.writes[0].data.groupe_id, group || null);
        assert.equal(f.writes[0].data.fonction_ca_id, null);
    }
});

test('création avec groupe : UUID conservé et aucune alerte', async () => {
    const f = fixture();
    const result = await f.controller.save({ chanteur_id: SINGER, groupe_id: GROUP });
    assert.equal(result.success, true);
    assert.equal(result.data.groupe_id, GROUP);
    assert.equal(f.writes[0].data.groupe_id, GROUP);
    assert.equal(result.warning, undefined);
});

test('modification : retirer explicitement le groupe envoie null et déclenche l’alerte', async () => {
    for (const group of ['', null]) {
        const f = fixture();
        const result = await f.controller.save({ id: MEMBERSHIP, chanteur_id: SINGER, groupe_id: group });
        assert.equal(result.success, true);
        assert.equal(result.warning, WARNING);
        assert.deepEqual(f.writes, [{ operation: 'update', data: { groupe_id: null } }]);
        assert.equal(result.data.groupe_id, null);
        assert.equal(result.data.fonction_ca_id, FUNCTION);
    }
});

test('modification partielle : un groupe omis garde sa valeur et ne déclenche pas d’alerte', async () => {
    const f = fixture();
    const result = await f.controller.save({ id: MEMBERSHIP, chanteur_id: SINGER, fonction_ca_id: '' });
    assert.equal(result.success, true);
    assert.deepEqual(f.writes, [{ operation: 'update', data: { fonction_ca_id: null } }]);
    assert.equal(result.data.groupe_id, GROUP);
    assert.equal(result.data.fonction_ca_id, null);
    assert.equal(result.warning, undefined);
});

test('le chanteur reste obligatoire et une validation refusée ne produit aucune alerte', async () => {
    const f = fixture();
    const failed = [];
    const result = await f.controller.save({ groupe_id: '' }, undefined, errors => failed.push(plain(errors)));
    assert.equal(result.success, false);
    assert.equal(result.warning, undefined);
    assert.deepEqual(plain(result.errors), [{ field: 'chanteur_id', message: 'Chanteurs obligatoire' }]);
    assert.deepEqual(failed, [plain(result.errors)]);
    assert.equal(f.writes.length, 0);
});

test('un échec de persistance ne déclenche ni alerte sans groupe ni callback de succès', async () => {
    for (const id of [undefined, MEMBERSHIP]) {
        const f = fixture({ error: 'Enregistrement refusé' });
        let successes = 0;
        let failures = 0;
        const result = await f.controller.save(
            { id, chanteur_id: SINGER, groupe_id: '' },
            () => successes++,
            () => failures++
        );
        assert.equal(result.success, false);
        assert.equal(result.message, 'Enregistrement refusé');
        assert.equal(result.warning, undefined);
        assert.equal(successes, 0);
        assert.equal(failures, 1);
    }
});

test('une association déjà présente reste refusée sans alerte ni écriture', async () => {
    const f = fixture({ exists: true });
    const result = await f.controller.save({ chanteur_id: SINGER, groupe_id: '' });
    assert.equal(result.success, false);
    assert.match(result.message, /déjà associé/);
    assert.equal(result.warning, undefined);
    assert.equal(f.writes.length, 0);
});
