import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { extname } from 'node:path';
import { after, test } from 'node:test';

// Node.js 24 : charger les vraies classes dont les imports suivent les conventions Vite.
const srcUrl = new URL('../src/', import.meta.url).href;
const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
        const relative = specifier.startsWith('./') || specifier.startsWith('../');
        if (context.parentURL?.startsWith(srcUrl) && relative && !extname(specifier)) {
            return nextResolve(`${specifier}.js`, context);
        }
        return nextResolve(specifier, context);
    }
});

const { ReferentielFonctionCaService } = await import('../src/services/ReferentielFonctionCaService.js');
const { ReferentielFonctionCaValidator } = await import('../src/validators/ReferentielFonctionCaValidator.js');
const { BaseMapper } = await import('../src/mappers/BaseMapper.js');

after(() => {
    hook.deregister();
});

function fixture() {
    let row = { id: 'fonction-id', libelle: 'président', ordre: 2 };
    let writes = 0;
    const repository = {
        insert: async data => {
            writes++;
            row = { id: 'fonction-id', ...data };
            return { data: { ...row }, error: null };
        },
        update: async (id, data) => {
            writes++;
            assert.equal(id, row.id);
            row = { ...row, ...data };
            return { data: { ...row }, error: null };
        }
    };
    const columns = [
        { field: 'libelle', header: 'Libellé', type: 'text', required: true },
        { field: 'ordre', header: 'Ordre', type: 'number' }
    ];
    const service = new ReferentielFonctionCaService(
        repository,
        new ReferentielFonctionCaValidator(columns),
        new BaseMapper(columns)
    );
    return { service, row: () => row, writes: () => writes };
}

test('création : ordre absent ou explicitement vide utilise 1000', async () => {
    for (const ordre of [undefined, '', '   ']) {
        const f = fixture();
        const result = await f.service.save({ libelle: '  secrétaire  ', ordre });
        assert.equal(result.success, true);
        assert.equal(result.data.ordre, 1000);
        assert.equal(f.row().ordre, 1000);
        assert.equal(f.row().libelle, 'secrétaire');
    }
});

test('création et édition acceptent zéro, les bornes et les nombres saisis en texte', async () => {
    for (const ordre of [0, 1000, 2147483647, '0', '1000', ' 42 ', '2147483647']) {
        for (const modification of [false, true]) {
            const f = fixture();
            const result = await f.service.save({
                ...(modification ? { id: 'fonction-id' } : {}),
                libelle: 'trésorier',
                ordre
            });
            assert.equal(result.success, true);
            assert.equal(result.data.ordre, Number(ordre));
            assert.equal(typeof f.row().ordre, 'number');
        }
    }
});

test('ordre invalide : erreur sur le champ et aucune écriture', async () => {
    for (const ordre of [-1, 1.5, 2147483648, NaN, Infinity, '-1', '0.5', '2147483648', 'abc', null, true, {}, []]) {
        const f = fixture();
        const result = await f.service.save({ libelle: 'président', ordre });
        assert.equal(result.success, false);
        assert.equal(result.errors[0].field, 'ordre');
        assert.match(result.message, /entier compris entre 0 et 2147483647/);
        assert.equal(f.writes(), 0);
    }
});

test('renommer avec ordre absent ou undefined préserve la valeur enregistrée', async () => {
    for (const entity of [
        { id: 'fonction-id', libelle: 'présidente' },
        { id: 'fonction-id', libelle: 'présidente', ordre: undefined }
    ]) {
        const f = fixture();
        const result = await f.service.save(entity);
        assert.equal(result.success, true);
        assert.equal(f.row().libelle, 'présidente');
        assert.equal(f.row().ordre, 2);
        assert.equal(result.data.ordre, 2);
    }
});

test('vider explicitement l’ordre en édition rétablit 1000', async () => {
    for (const ordre of ['', '   ']) {
        const f = fixture();
        const result = await f.service.save({ id: 'fonction-id', libelle: 'président', ordre });
        assert.equal(result.success, true);
        assert.equal(f.row().ordre, 1000);
    }
});

test('la validation du libellé reste appliquée avec un ordre valide', async () => {
    const f = fixture();
    const result = await f.service.save({ libelle: '  ', ordre: 0 });
    assert.equal(result.success, false);
    assert.equal(result.errors[0].field, 'libelle');
    assert.equal(f.writes(), 0);
});
