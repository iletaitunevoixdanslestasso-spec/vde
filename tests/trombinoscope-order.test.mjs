import test from 'node:test';
import assert from 'node:assert/strict';
import { FILTRE_CA, filtrerChanteursTrombi } from '../src/components/trombinoscope/trombiUtils.js';

const membre = (id, nom, prenom, ordre, groupe = 'a') => Object.freeze({
    id, nom, prenom, fonction_ca_id: `fonction-${id}`, fonction_ca_ordre: ordre, groupe_id: groupe
});
const identifiants = chanteurs => chanteurs.map(chanteur => chanteur.id);

test('le CA est trié numériquement par ordre puis par nom et prénom français', () => {
    const personnes = Object.freeze([
        membre('dix', 'Albert', 'Alice', 10),
        membre('deux-zoe', 'Émile', 'Zoé', 2),
        membre('zero', 'Zorro', 'Zacharie', 0),
        membre('deux-alice', 'émile', 'Alice', 2),
        Object.freeze({ id: 'sans-fonction', nom: 'Avant', fonction_ca_id: null, fonction_ca_ordre: 0 })
    ]);
    assert.deepEqual(identifiants(filtrerChanteursTrombi(personnes, FILTRE_CA)), [
        'zero', 'deux-alice', 'deux-zoe', 'dix'
    ]);
    assert.deepEqual(identifiants(personnes), ['dix', 'deux-zoe', 'zero', 'deux-alice', 'sans-fonction']);
});

test('les ordres absents ou invalides arrivent à la fin avec un tri alphabétique entre eux', () => {
    const personnes = [
        membre('nan', 'César', 'C', NaN),
        membre('null', 'Albert', 'A', null),
        membre('normal', 'Zorro', 'Z', 1000),
        membre('undefined', 'Bernard', 'B', undefined)
    ];
    assert.deepEqual(identifiants(filtrerChanteursTrombi(personnes, FILTRE_CA)), [
        'normal', 'null', 'undefined', 'nan'
    ]);
});

test('tous et les groupes réels conservent leur ordre et ne modifient pas les données', () => {
    const personnes = Object.freeze([
        membre('dix', 'Zorro', 'Z', 10, 'a'),
        membre('zero', 'Albert', 'A', 0, 'b'),
        membre('deux', 'Bernard', 'B', 2, 'a')
    ]);
    assert.equal(filtrerChanteursTrombi(personnes, 'tous'), personnes);
    assert.deepEqual(identifiants(filtrerChanteursTrombi(personnes, 'a')), ['dix', 'deux']);
    assert.deepEqual(identifiants(filtrerChanteursTrombi(personnes, 'absent')), []);
    assert.deepEqual(identifiants(personnes), ['dix', 'zero', 'deux']);
});
