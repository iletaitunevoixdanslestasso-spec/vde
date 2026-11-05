const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/components/PwaStartRedirect.jsx'), 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export default function ', 'function ');
function fixture({ pathname = '/', search = '', token = 'stored-B', cookie = '' } = {}) {
    const effects = [];
    const messages = new Map();
    const visits = [];
    const context = vm.createContext({
        URLSearchParams, localStorage: { getItem: () => token }, document: { cookie },
        navigator: { serviceWorker: { addEventListener: (name, handler) => messages.set(name, handler), removeEventListener: name => messages.delete(name) } },
        window: { location: { pathname, search, assign: value => visits.push(['assign', value]), replace: value => visits.push(['replace', value]) } },
        useEffect: callback => effects.push(callback)
    });
    vm.runInContext(source + '\nPwaStartRedirect();', context);
    const cleanups = effects.map(callback => callback()).filter(callback => typeof callback === 'function');
    return { messages, visits, cleanup: () => cleanups.forEach(callback => callback()) };
}

test('un clic Push respecte le chanteur de la fenêtre courante, pas le token d’un autre onglet', () => {
    const f = fixture({ pathname: '/chanteur/route-A/profil', token: 'stored-B' });
    f.messages.get('message')({ data: { type: 'OPEN_NOTIFICATIONS' } });
    assert.deepEqual(f.visits, [['assign', '/chanteur/route-A/notifications']]);
    f.cleanup();
    assert.equal(f.messages.size, 0);
});

test('application fermée : demande Push redirigée vers le token local, puis routes protégées habituelles', () => {
    const f = fixture({ search: '?pwa=1&notifications=1', token: 'stored-B' });
    assert.deepEqual(f.visits, [['replace', '/chanteur/stored-B/notifications']]);
});

test('un ancien cookie de PWA restaure uniquement un chemin chanteur local', () => {
    const f = fixture({ search: '?pwa=1&notifications=1', token: null, cookie: 'pwa_chanteur_path=%2Fchanteur%2Froute-A%2Fprofil' });
    assert.deepEqual(f.visits, [['replace', '/chanteur/route-A/notifications']]);
});

test('sans accès personnel, un message inattendu ne déclenche aucune navigation', () => {
    const f = fixture({ token: null });
    f.messages.get('message')({ data: { type: 'OPEN_NOTIFICATIONS' } });
    f.messages.get('message')({ data: { type: 'UNRELATED', token: 'injected' } });
    assert.deepEqual(f.visits, []);
});
