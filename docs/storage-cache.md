# Cache Storage : photos et droits à l’image

## Périmètre et durées

Les noms viennent des usages existants du dépôt :

| Catégorie | Bucket / fichiers | Cache-Control des nouveaux objets |
| --- | --- | --- |
| `photos_choristes` | `photos-chanteurs`, notamment `chanteurs/{id}/{fichier}` | `12960000` secondes, soit 150 jours |
| `pdf_dai` | `chanteur-documents/{id}/droit_image.pdf` | `12960000` secondes |
| `pdf_dai` | Modèle DAI dans `referentiel-documents`, identifié par `document_types.code = 'droit_image'` | `12960000` secondes |

Les autres documents du bucket `referentiel-documents` et les autres catégories ne prennent pas cette durée automatiquement. Aucune visibilité de bucket ni politique de lecture des fichiers n’est modifiée.

Le cache navigateur existant (`PhotoCacheService`, Cache Storage, séparation par session ou empreinte du token chanteur, déduplication des téléchargements) est réutilisé. La version de catégorie entre dans sa clé stable. Les paramètres des URL signées sont conservés avec `URL.searchParams`; aucun timestamp n’est ajouté à chaque rendu.

## Réutilisation des liens signés après rechargement

`SignedUrlCacheService` conserve les URL de téléchargement Supabase dans `localStorage` (`vde-signed-download-urls-v2`, au plus 500 entrées). Les liens sont réutilisés après rechargement, entre onglets et après fermeture/réouverture du navigateur, pour le même site et le même profil navigateur, jusqu’à leur expiration avec une marge de renouvellement de 30 secondes. La durée réelle inscrite dans le token reste la limite, y compris pour les PDF privés : la conservation des liens ne les prolonge pas à 150 jours. Si le stockage est bloqué ou saturé, le cache fonctionne en mémoire pendant la page courante.

Tous les téléchargements des services existants sont couverts : photos administrateur et trombinoscopes, DAI personnel, modèle DAI, documents choriste/adhérent, documents du référentiel et paroles. Les liens publics ou externes sont laissés tels quels. Les autorisations et tokens d’upload signés ne sont jamais mis en cache par ce service.

Les entrées sont séparées par UID Auth ou empreinte du token chanteur explicitement utilisé, y compris lorsqu’un administrateur est également connecté. L’origine, le chemin et tous les paramètres autres que `token` (notamment `v`, `download` et les transformations) distinguent les variantes. Les appels directs distinguent également la durée demandée. Une URL nouvellement autorisée pour une échéance plus courte ne reprend pas une ancienne signature plus longue.

Les fonctions métier continuent de vérifier les accès et de renvoyer des métadonnées fraîches : le client réutilise seulement les URL reçues, sans remettre en circulation un document absent ou un ancien workflow DAI. Elles peuvent encore fabriquer une nouvelle signature côté serveur, mais cette nouvelle URL n’est pas utilisée pour télécharger les octets lorsqu’une URL autorisée équivalente est déjà conservée. Les signatures obtenues directement avec le SDK sont également réutilisées jusqu’à expiration dans la session du compte.

Un upload, remplacement ou retrait de fichier invalide ses liens conservés. Le changement de version photos/DAI utilise une nouvelle clé. La déconnexion Auth et le changement de token chanteur purgent ce cache ; les requêtes déjà en vol ne peuvent pas repeupler les entrées invalidées. Un événement `INITIAL_SESSION` ou `SIGNED_IN` répété ne le vide pas.

Les onglets déjà ouverts relisent les données partagées lors des accès au cache. Une révision d’invalidation distincte (`vde-signed-download-urls-epoch-v1`) propage les purges et empêche une ancienne requête d’un autre onglet de rétablir un lien invalidé. Les autres fichiers restent réutilisables après l’invalidation d’un seul chemin.

Supprimer uniquement `Cache Storage → vde-photos-privees-v2` conserve les URL dans `localStorage` : un nouveau téléchargement peut ainsi réutiliser le même lien et bénéficier du CDN. Effacer toutes les données du site supprime aussi les URL conservées. Un `HIT` reste conditionné à la présence de cette URL dans le nœud CDN ; ce mécanisme ne préchauffe pas le CDN et ne partage pas les liens entre utilisateurs, appareils ou sites d’origines différentes (`localhost` et le site publié ont chacun leur stockage).

Cette amélioration est entièrement côté navigateur : elle demande de publier le frontend mis à jour, sans nouvelle migration SQL ni fonction Supabase à redéployer.

**Confidentialité DAI :** le `Cache-Control` des objets est demandé à 150 jours mais la copie applicative des PDF privés est volontairement limitée à une heure et à l’expiration de l’URL signée. La validité existante des signatures reste d’une heure. Un navigateur/CDN peut néanmoins conserver les octets selon sa politique et les en-têtes reçus : l’expiration d’un lien n’efface pas un fichier déjà téléchargé. Une révocation immédiate des copies téléchargées n’est jamais garantie. Si cette exigence est requise, il faut réduire aussi le cache HTTP des DAI (par exemple à 3600 secondes, voire `no-store`) dans un changement de politique explicite, sans rendre le bucket public. Le script de migration ci-dessous applique 150 jours ; ne pas l’exécuter pour les DAI avant d’avoir accepté cette conséquence.

## Autorisation et configuration

La migration `supabase/migrations/20261104120000_storage_cache_config.sql` crée la table si nécessaire, conserve les versions existantes et règle les deux durées à 150 jours. Les utilisateurs Supabase Auth ont uniquement le droit `SELECT`; `anon` n’a aucun droit direct. Aucune mise à jour n’est accordée à tous les utilisateurs authentifiés.

Les sessions Supabase Auth lisent directement `storage_cache_config` via le client Supabase, avec leur JWT et les RLS ci-dessus. Cette lecture ne dépend pas du déploiement de l’Edge Function `storage-cache-config`. Les choristes sans session Auth continuent de passer par cette fonction, qui valide leur token avec la validation habituelle et ne leur renvoie que les métadonnées de cache.

Sur `/admin/cache`, une vérification séparée auprès de `storage-cache-config` détermine le droit d’actualisation. Si la fonction est absente ou indisponible, les versions lues en SQL restent affichées et un message signale l’indisponibilité de l’actualisation, sans conclure à un refus de droits du compte. L’action `refresh` exige toujours un JWT utilisateur vérifié et un UID dans la liste serveur `PUSH_ADMIN_USER_IDS`, comme l’autorisation administrateur déjà utilisée par l’envoi Push. Un token chanteur, une simple session non autorisée ou le secret de test Push ne permet pas l’invalidation.

L’incrément est atomique via `increment_storage_cache_version(text)`, exécutable uniquement par `service_role`. Les clients ne peuvent ni écrire la table ni appeler ce RPC. Les secrets restent côté serveur.

L’administration fournit `/admin/cache`, avec deux actions séparées et confirmation : photos et PDF DAI. La configuration client est mémorisée 60 secondes : les autres sessions voient la nouvelle version lors du prochain chargement de configuration après ce délai ou lors d’un rechargement explicite. Les images déjà affichées ne sont pas forcées à télécharger en boucle. Cette action change une version applicative ; elle ne supprime pas les fichiers déjà téléchargés et ne promet pas de purger instantanément tous les caches CDN.

## Mise en service

Aucune migration SQL, fonction distante ou opération de masse n’est exécutée par l’intégration du code. Avant activation, revoir le SQL et les fonctions modifiées, vérifier les UID autorisés et les règles de confidentialité DAI. Appliquer ensuite la migration avec le processus Supabase habituel et déployer les fonctions concernées, dont `storage-cache-config` avec vérification JWT de passerelle désactivée si nécessaire pour les tokens chanteurs : la fonction effectue elle-même leur validation. Les fonctions existantes continuent d’exiger leur validation avant de signer ou renvoyer des fichiers privés.

Vérifier en particulier que les fonctions suivantes ont été mises à jour : `get-trombinoscope`, `trombinoscope-saison`, `get-chanteur-droit-image`, `get-chanteur-droit-image-template`, `sync-chanteur-photo` et la nouvelle `storage-cache-config`. Les signatures restent à leur durée existante ; le cache des octets n’étend pas l’autorisation d’obtenir une signature.

## Fichiers existants : inventaire puis migration optionnelle

Le helper `scripts/storage-cache-migration.mjs` utilise uniquement les API Supabase Storage et la lecture des références de modèles. Il ne modifie jamais `storage.objects`, les chemins applicatifs, les références métier ni les paramètres des buckets.

Exécuter avec Node.js 24 depuis la racine du dépôt. Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` doivent être fournies par un mécanisme sécurisé à un poste de maintenance. Ne jamais mettre cette clé dans Vite, un argument de commande, un fichier suivi ou un message. Conserver les proxies et la confiance TLS de la plateforme ; `NODE_USE_ENV_PROXY=1` permet à Node d’utiliser les proxies hérités.

Inventaire en lecture seule côté Supabase :

```sh
NODE_USE_ENV_PROXY=1 node scripts/storage-cache-migration.mjs --output /chemin/prive/inventaire-cache.json
```

Le script parcourt les listes avec pagination et récupère les informations des objets via l’endpoint HTTPS documenté `/storage/v1/object/info`. Cette lecture conserve intégralement les clés des métadonnées personnalisées, y compris les clés imbriquées en `snake_case` : la méthode SDK `.info()` n’est pas utilisée car elle les convertit récursivement en `camelCase`. Seuls les champs système de premier niveau sont normalisés pour les contrôles. L’authentification et les paramètres proxy/TLS hérités sont conservés. Il cible les photos, les DAI personnels au chemin exact et uniquement les modèles DAI référencés. Le résumé console ne montre ni noms de fichiers ni identifiants de personnes. L’inventaire contient des chemins sensibles : fichier local en mode `0600`, à conserver hors du dépôt. Revoir les objets, types MIME, tailles, durées et le volume d’egress nécessaire avant de continuer.

Les objets dont le TTL est déjà d’au moins 150 jours sont conservés. Les objets sans métadonnées suffisantes ou les DAI qui ne sont pas des PDF bloquent la migration ; cela nécessite une analyse, pas une correction automatique des données.

Pour appliquer après revue, arrêter temporairement uploads et synchronisation des photos, puis utiliser un **nouveau** répertoire de sauvegarde situé sur un volume privé suffisamment grand :

```sh
NODE_USE_ENV_PROXY=1 node scripts/storage-cache-migration.mjs \
  --apply --confirm-paused-writes \
  --backup-dir /chemin/prive/sauvegarde-cache-neuve
```

L’inventaire est recalculé au début de cette commande. Le script télécharge et vérifie **toutes** les sauvegardes avant la première mise à jour distante. Il stocke les octets, SHA-256 et métadonnées dans le manifeste, puis utilise `Storage.update()` au même chemin avec le MIME et les métadonnées personnalisées d’origine. Des contrôles ID/version avant sauvegarde et avant écriture arrêtent le traitement si l’objet a changé. L’arrêt des écritures reste indispensable : l’API n’offre pas ici de transaction globale ni de garantie contre un changement entre le dernier contrôle et l’update.

Après chaque mise à jour, taille, ID, MIME, métadonnées, TTL et SHA-256 des octets retéléchargés sont vérifiés. Le manifeste distingue les objets mis à jour et ceux vérifiés. Ces téléchargements et réécritures génèrent volontairement de l’egress et du trafic pour cette migration ponctuelle. Le script ne supprime aucun fichier et ne réessaie pas automatiquement.

En cas d’arrêt : ne pas relancer aveuglément et ne pas restaurer automatiquement au risque d’écraser un nouvel upload. Lire le manifeste privé, comparer l’objet actuel, puis restaurer si nécessaire via `Storage.update()` avec les octets sauvegardés et les métadonnées d’origine. Ne jamais toucher directement `storage.objects`. La version technique Storage et les dates de modification peuvent changer lors d’un update ; les chemins/références métier et les octets restent identiques. Reprendre les uploads seulement après revue.

## Vérification fonctionnelle et mesure

Exécuter `node tests/storage-cache-migration.test.mjs` pour les trois tests de migration sans accès réseau. Le premier reproduit la conversion des clés personnalisées par la version installée de Storage SDK et vérifie que la lecture REST conserve les originaux, même en présence de clés `custom_key` et `customKey` distinctes. Les autres vérifient leur préservation dans la sauvegarde et l’update, ainsi que le refus de continuer sans lecteur de métadonnées brutes.

Les tests locaux avec doublures valident la sélection des catégories, l’inventaire sans écriture, la sauvegarde complète avant toute mise à jour, la conservation du contenu/MIME/métadonnées et le blocage des écritures en cas d’échec de sauvegarde. Ils ne constituent pas une migration ni un test du Supabase distant.

Après mise en service dans un environnement autorisé :

1. Ouvrir un trombinoscope et un DAI privé ; vérifier contenu, permissions et `Cache-Control` dans les réponses réelles.
2. Réafficher les mêmes fichiers dans la même session : aucun nouveau téléchargement des octets pendant leur TTL local. Vérifier les requêtes dans DevTools en gardant le cache activé.
3. Incrémenter uniquement la version photos, puis recharger la configuration dans une autre session : une nouvelle récupération des photos doit apparaître, sans changement de version DAI. Faire l’inverse pour les DAI.
4. Tester les actions avec un compte non autorisé et un token chanteur : l’écriture doit être refusée côté serveur.
5. Vérifier qu’un autre document du référentiel garde son comportement de cache antérieur.
6. Comparer Storage Egress et Cached Egress sur plusieurs journées de charge comparable. La compilation et les tests locaux ne démontrent ni la présence d’un cache CDN réel ni une baisse mesurée de consommation ; ces résultats nécessitent les métriques distantes après déploiement.

## Vérifications automatisées de cette intégration

Depuis la racine du dépôt :

```sh
node tests/storage-cache.test.cjs
node tests/storage-cache-config.test.cjs
node tests/signed-url-cache.test.cjs
node tests/signed-url-integration.test.cjs
node tests/storage-cache-migration.test.mjs
node supabase/functions/storage-cache-config/index.test.cjs
npm run build
```

Les tests de configuration vérifient la lecture Auth sous RLS sans appel à l’Edge Function, la validation serveur des tokens chanteurs, les erreurs de lecture et la séparation des droits d’actualisation. Les tests backend vérifient les autorisations et l’invalidation par catégorie avec Auth/Storage simulés. Les vérifications Chromium du formulaire d’administration ont également utilisé un service simulé sans appel distant. Elles ne constituent pas une validation des comptes ou des fichiers du projet Supabase réel. Le runtime Deno n’était pas installé : la syntaxe TypeScript a été vérifiée, sans contrôle de types Deno. Le lint ciblé des nouveaux services/pages est passé ; le lint global continue de signaler les défauts préexistants du dépôt.

Les tests de liens signés recréent les modules dans de nouveaux environnements de page et font aussi fonctionner plusieurs onglets simultanés partageant le même `localStorage`. Ils vérifient la stabilité des URL après rechargement et entre onglets, leur expiration, les variantes, les comptes et tokens distincts, les réponses métier fraîches, les invalidations et les déconnexions pendant une requête, y compris depuis un autre onglet. Ils utilisent un SDK et un serveur simulés ; ils ne démontrent pas un taux de `HIT` CDN distant.

Les entrées d’ancien format du cache photo sont nettoyées au prochain accès ; les anciennes versions et les copies expirées sont purgées lors de l’utilisation du cache. Une application fermée ne peut pas exécuter ce nettoyage : la limite locale d’une heure des PDF est une limite d’utilisation, pas une garantie d’effacement physique immédiat.
