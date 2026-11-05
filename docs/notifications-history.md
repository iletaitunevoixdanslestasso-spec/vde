# Historique et boîte personnelle des notifications

## Comportement

Une publication depuis le formulaire administrateur crée désormais un message en BDD **avant** l’envoi Push. Le titre, le contenu, l’auteur et la date sont conservés. Les destinataires sont figés à cet instant parmi les chanteurs sélectionnés de la saison active, y compris ceux sans appareil abonné. Ceux-ci peuvent retrouver le message dans leur espace sans recevoir d’alerte système.

Le bloc « Historique des messages » sous le formulaire montre les publications récentes, leur auteur et leur date, ainsi que le bilan Push. Une simulation n’enregistre rien. Les anciens envois non archivés ne peuvent pas être reconstitués. Les anciens modes manuels `tous` et abonnement individuel restent des outils de test et n’alimentent pas cet historique ; le formulaire utilise le mode `selection`.

Chaque chanteur dispose de `/chanteur/:token/notifications`. La cloche du tableau de bord, du menu et du module d’activation ouvre cette page. Elle affiche un compteur de messages non lus dans l’application, indépendant du badge du navigateur Android. L’ouverture d’un message demande son marquage comme lu ; le bouton permet de le remettre en non lu. Une erreur de sauvegarde laisse l’état inchangé à l’écran. Le compteur et la liste sont actualisés au retour au premier plan et sur demande. Il n’y a pas de marquage automatique de tous les messages à l’ouverture de la liste.

La lecture est enregistrée par **chanteur**, pas par appareil. Les messages reçus lors des saisons précédentes restent dans son historique personnel. Un clic sur une alerte Push ouvre également la boîte personnelle lorsque l’appareil connaît encore son accès. Ouvrir la boîte ne signifie pas que chaque message a été lu.

## Message intégral et aperçu Push

Le champ « Message complet » accepte désormais plus de 500 caractères. Les paragraphes, accents et emojis sont conservés dans l’historique et la boîte personnelle (avec le nettoyage habituel des espaces de début/fin). Seule la copie envoyée aux fournisseurs Push est raccourcie : environ 160 caractères visibles, avec une ellipse si nécessaire et les espaces / retours à la ligne normalisés pour l’alerte.

La règle est factorisée dans `supabase/functions/_shared/notification-content.js`, module pur utilisé par React et par l’Edge Function. Le formulaire affiche le même aperçu que celui préparé côté serveur. La charge JSON Push entière — titre, aperçu et identifiant de message compris — est limitée volontairement à 3 000 octets UTF-8, avec une marge pour le chiffrement et les fournisseurs. Les emojis composés ne sont pas coupés au milieu lorsque `Intl.Segmenter` est disponible ; le repli préserve les paires UTF-16.

La limite de 500 caractères du corps a été supprimée. Un garde-fou explicite de **1 Mio UTF-8** reste appliqué au texte complet pour les ressources serveur. Le titre conserve sa limite existante de 80 caractères. Ces paramètres sont des choix applicatifs centralisés, pas des seuils imposés à l’identique par Supabase.

Pour les installations ayant déjà l’historique, appliquer la migration additive `supabase/migrations/20261105160000_notification_full_content.sql` : elle remplace uniquement la contrainte sur `contenu`, sans changer les messages existants, leurs destinataires ou les états lu/non lu. Il faut ensuite redéployer `push-test` ; les fonctions de lecture ne nécessitent pas de changement. Une installation neuve applique d’abord la migration de l’historique, puis cette nouvelle migration.

L’historique et la vérification des nouvelles tentatives comparent toujours le **texte complet** : deux messages ayant le même aperçu mais des fins différentes ne sont jamais considérés comme identiques.

## Données et autorisations

La migration `supabase/migrations/20261105140000_notification_messages.sql` ajoute :

- `notification_messages` : identifiant d’envoi, saison, titre, contenu, UID et nom de l’auteur, date serveur, état et compteurs Push.
- `notification_destinataires` : lien entre un message et un chanteur, avec `lu_le` ; une seule ligne par paire.
- `creer_notification_message(...)` : création atomique du message et de tous ses destinataires, réservée au rôle serveur.

Le nom de l’auteur vient de la session Supabase Auth vérifiée : nom complet, nom de compte ou e-mail en repli ; son UID est conservé côté serveur. Le client ne choisit ni l’auteur ni la date. Un appel de test en mode sélection utilisant le secret manuel porte l’auteur « Test manuel ».

La RLS est activée et aucun droit direct n’est accordé aux rôles `anon` ou `authenticated` sur ces tables. L’API personnelle valide le token chanteur existant avec `get_mon_profil`, déduit son identifiant et filtre chaque lecture / modification par cet identifiant. Le navigateur ne peut pas choisir un autre chanteur. L’API de l’historique administratif exige une session Auth vérifiée avec UID dans la liste serveur existante `PUSH_ADMIN_USER_IDS` ; le secret des tests Push ne suffit pas. Aucun nouveau secret n’est placé dans React.

Les réponses personnelles et administratives utilisent `Cache-Control: no-store`. La boîte n’est pas ajoutée au cache persistant navigateur des photos/documents. Les textes sont rendus comme du texte React, sans HTML fourni par les messages.

## Envoi, erreurs et nouvelles tentatives

Le formulaire conserve un UUID d’envoi tant que le contenu et la sélection ne changent pas. Le RPC sérialise les appels portant cet UUID : un doublon identique retourne l’enregistrement existant, un autre contenu / auteur / sélection est refusé. Aucun Push n’est renvoyé pour le même UUID. Une nouvelle publication volontaire doit passer par « Rédiger un autre message » / une nouvelle composition.

Une erreur de base avant archivage interdit tout Push. Un échec des services Push ne supprime pas le message de la boîte. Si l’archivage réussit mais que le bilan final ne peut pas être sauvegardé, l’envoi reste « à vérifier » et une nouvelle tentative ne déclenche pas de seconde diffusion. Il faut consulter l’historique plutôt que recréer aveuglément un envoi.

« Accepté » décrit la réponse du fournisseur Push ; cela ne garantit ni l’affichage ni la lecture. La limite de 200 appareils Push par publication est conservée. Une publication avec zéro appareil est permise pour alimenter les boîtes personnelles.

## Fichiers et factorisation

| Fichier / groupe | Responsabilité |
| --- | --- |
| `supabase/migrations/20261105140000_notification_messages.sql` | Tables, index, RLS et RPC atomique/idempotent ; les tables métier existantes sont réutilisées. |
| `supabase/functions/_shared/notification-messages.ts` | Repository serveur commun à la publication, à l’historique et à la boîte personnelle. |
| `supabase/functions/_shared/notification-content.js` | Validation et aperçu communs à l’interface et au serveur ; contrôle du JSON Push en octets sans raccourcir l’archive. |
| `supabase/migrations/20261105160000_notification_full_content.sql` | Évolution de la contrainte du corps complet, sans modifier la migration précédente ni les données existantes. |
| `supabase/functions/push-test/index.ts`, `PushAuthorizationService.ts` | Auteur issu de l’authentification existante, archivage avant Push, absence de doublons et référence au message dans l’alerte. |
| `supabase/functions/notifications/index.ts` | Liste, compteur et lecture propres au chanteur validé par le mécanisme de token existant. |
| `supabase/functions/notifications-admin/index.ts` | Historique paginé protégé par l’autorisation administrateur existante. |
| `src/repositories/EdgeFunctionRepository.js`, `PushAdminRepository.js`, `NotificationMessageRepository.js` | Appels SDK et traitement d’erreurs factorisés ; le repository Push existant est réutilisé. |
| `src/services/NotificationMessageService.js`, `PushAdminService.js` | Validation, pagination, partage du compteur, nouvelles tentatives et garde contre un ancien backend sans historique. |
| `src/pages/admin/notifications/NotificationHistory.jsx` et `.css` | Historique sous le formulaire, auteur/date, contenu et état Push ; CSS séparé. |
| `src/pages/admin/notifications/NotificationsAdminPage.jsx` | Identifiant conservé pour les nouvelles tentatives, publication sans abonnement Push et rafraîchissement de l’historique. |
| `src/pages/chanteur/NotificationsChanteur.jsx`, `src/styles/espaceChanteur_notifications.css` | Liste paginée, ouverture, lu/non lu, erreurs et présentation mobile avec la charte existante. |
| `NotificationInboxLink.jsx` et `.css`, `useNotificationsNonLues.js` | Même cloche et compteur dans les points d’entrée, sans mélanger deux accès chanteurs. |
| `ChanteurMenu.jsx`, `Dashboard.jsx`, `NotificationPermission.jsx`, `src/app/router.jsx` | Liens et route ajoutés ; l’activation des notifications Push reste distincte. |
| `public/push-handlers.js`, `PwaStartRedirect.jsx` | Clic sur une alerte archivée vers la boîte ; le token reste sur l’appareil et n’est jamais placé dans le Push. |
| `src/helper/helper.js` | Format de date/heure commun en français et fuseau Europe/Paris. |

## Mise en service Supabase

L’intégration Git ne modifie pas votre base ni les fonctions déployées. Pour activer la fonctionnalité :

1. Relire puis appliquer **les migrations** `20261105140000_notification_messages.sql`, puis `20261105160000_notification_full_content.sql` dans le projet Supabase concerné, via votre procédure habituelle ou l’éditeur SQL. Vérifier les autres migrations en attente avant d’utiliser une commande globale de migration.
2. Déployer les fonctions dans ce même projet :

```sh
npx supabase functions deploy notifications --no-verify-jwt
npx supabase functions deploy notifications-admin --no-verify-jwt
npx supabase functions deploy push-test --no-verify-jwt
```

Les fonctions effectuent elles-mêmes leurs contrôles d’identité et d’autorisation ; les sections correspondantes sont déclarées dans `supabase/config.toml`. Les valeurs serveur habituelles et `PUSH_ADMIN_USER_IDS` restent nécessaires ; aucune nouvelle clé n’est demandée.

3. Vérifier la fin du déploiement Vercel de `develop`, puis accepter la mise à jour de l’application si elle est proposée.
4. Simuler : aucune ligne ne doit être créée. Publier ensuite volontairement vers un chanteur de test. Vérifier une seule ligne d’historique et sa présence dans sa boîte ; un autre chanteur non destinataire ne doit pas le voir.
5. Ouvrir le message, vérifier « Lu » sur le second appareil après actualisation, puis le remettre en « Non lu ».

Le nouveau formulaire refuse de publier lorsqu’une simulation ne confirme pas la présence du nouveau backend d’historique. Tant que les migrations/fonctions ne sont pas mises à jour, la boîte et l’historique peuvent afficher une indisponibilité.

## Tests

```sh
npm run build
node tests/push-admin-service.test.cjs
node tests/notification-content.test.mjs
node tests/notification-message-service.test.cjs
node tests/notification-navigation.test.cjs
node tests/push-worker.test.cjs
node supabase/functions/push-test/selection.test.cjs
node supabase/functions/notifications/notifications.test.cjs
```

Ces tests n’appellent ni Supabase distant ni les services Push. Des vérifications Chromium avec services simulés couvrent les états de lecture, les erreurs, les réponses périmées, le changement de chanteur et les largeurs mobiles de 320/390 pixels.

Pour les droits, transactions et appels simultanés, le test SQL utilise PostgreSQL 17 dans un conteneur local jetable, sans réseau et sans identifiants Supabase :

```sh
# Prérequis : démon Docker local et image officielle postgres:17-alpine déjà disponible.
bash tests/notification-history-sql.sh
```

La validation locale ne remplace pas le test après application de la migration et déploiement dans votre projet réel. Aucun envoi réel n’est effectué par cette procédure de tests automatisés.

Les vérifications de types Deno des trois fonctions (`push-test`, `notifications`, `notifications-admin`) passent aussi. Les validations Node comprennent des régressions sur les compteurs périmés, les onglets de deux chanteurs et les nouvelles tentatives d’envoi. Les défauts ESLint préexistants des anciens fichiers ne sont pas corrigés dans cette évolution ; les nouveaux fichiers passent le contrôle ciblé.
