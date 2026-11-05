import test from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_MESSAGE_BYTES, MAX_PUSH_PAYLOAD_BYTES, PUSH_PREVIEW_LENGTH,
    validerContenuNotification, creerNotificationPush, serialiserNotificationPush, messageByteLength
} from '../supabase/functions/_shared/notification-content.js';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const segments = text => [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(text)].map(item => item.segment);

test('le contenu intégral dépasse 500 caractères et conserve paragraphes et emojis', () => {
    const content = 'Premier paragraphe.\n\n' + 'Musique 🎵 et répétition. '.repeat(100) + 'Fin du message.';
    const validated = validerContenuNotification(' Titre ', content);
    assert.equal(validated.titre, 'Titre');
    assert.equal(validated.message, content);
    const push = creerNotificationPush({ title: validated.titre, body: validated.message, notification_id: id });
    assert.equal(push.notification_id, id);
    assert.equal(push.title, 'Titre');
    assert(segments(push.body).length <= PUSH_PREVIEW_LENGTH);
    assert(push.body.endsWith('…'));
    assert(!push.body.includes('\n'));
    assert.equal(validated.message, content);
});

test('un texte court est transmis entier et seules les espaces de l’aperçu sont normalisées', () => {
    const body = 'Bonjour\n\nà tous !';
    assert.equal(creerNotificationPush({ title: 'Titre', body }).body, 'Bonjour à tous !');
    assert.equal(validerContenuNotification('Titre', body).message, body);
});

test('limites exactes de l’aperçu et ellipse incluse dans les 160 graphèmes', () => {
    for (const length of [159, 160]) {
        const body = 'a'.repeat(length);
        assert.equal(creerNotificationPush({ title: 'Titre', body }).body, body);
    }
    const body = creerNotificationPush({ title: 'Titre', body: 'a'.repeat(161) }).body;
    assert.equal(body, 'a'.repeat(159) + '…');
});

test('emoji familial et accents combinés ne sont pas coupés au milieu', () => {
    for (const grapheme of ['👨‍👩‍👧‍👦', 'e\u0301', '🇫🇷']) {
        const push = creerNotificationPush({ title: 'Titre', body: grapheme.repeat(200), notification_id: id });
        const pieces = segments(push.body);
        assert(pieces.length <= PUSH_PREVIEW_LENGTH);
        assert(pieces.every(item => item === grapheme || item === '…'));
        assert(messageByteLength(JSON.stringify(push)) <= MAX_PUSH_PAYLOAD_BYTES);
    }
});

test('la taille porte sur le JSON UTF-8 complet, y compris les caractères échappés et l’identifiant', () => {
    for (const body of ['\u0001'.repeat(1000), '🎶'.repeat(1000), '\\"'.repeat(1000)]) {
        const serialized = serialiserNotificationPush({ title: 'Titre 🎶', body, notification_id: id });
        assert(messageByteLength(serialized) <= MAX_PUSH_PAYLOAD_BYTES);
        const push = JSON.parse(serialized);
        assert.equal(push.notification_id, id);
        assert.equal(push.title, 'Titre 🎶');
    }
});

test('un graphème très volumineux reste en base mais produit un aperçu sûr', () => {
    const body = 'e' + '\u0301'.repeat(5000);
    assert.equal(validerContenuNotification('Titre', body).message, body);
    const serialized = serialiserNotificationPush({ title: 'Titre', body, notification_id: id });
    assert(messageByteLength(serialized) <= MAX_PUSH_PAYLOAD_BYTES);
    assert(JSON.parse(serialized).body.length > 0);
});

test('garde-fou de 1 Mio exact en UTF-8, pas en nombre de caractères', () => {
    assert.equal(validerContenuNotification('Titre', 'a'.repeat(MAX_MESSAGE_BYTES)).message.length, MAX_MESSAGE_BYTES);
    assert.equal(messageByteLength(validerContenuNotification('Titre', 'é'.repeat(MAX_MESSAGE_BYTES / 2)).message), MAX_MESSAGE_BYTES);
    assert.throws(() => validerContenuNotification('Titre', 'é'.repeat(MAX_MESSAGE_BYTES / 2 + 1)), /1 Mio/);
    assert.throws(() => validerContenuNotification('Titre', 'a'.repeat(MAX_MESSAGE_BYTES + 1)), /1 Mio/);
    assert.throws(() => validerContenuNotification('Titre', '  \n '), /vide/);
});

test('des métadonnées non bornées ne peuvent pas dépasser le budget du Push', () => {
    assert.throws(() => serialiserNotificationPush({ title: 'a'.repeat(4000), body: 'Message' }), /taille maximale/);
    const serialized = serialiserNotificationPush({ title: 'a'.repeat(2950), body: 'e' + '\u0301'.repeat(1000) });
    assert(messageByteLength(serialized) <= MAX_PUSH_PAYLOAD_BYTES);
});
