# Destinataires des notifications Push

La page `/admin/notifications` propose uniquement les chanteurs associés à la saison active (`saisons.active = true`, saison et association non supprimées, chanteur non supprimé). Le sélecteur global de saison de l’administration ne modifie pas ce périmètre. Les adhérents sans inscription à cette saison ne figurent pas dans la liste.

La liste est triée en français par nom puis prénom. Aucune personne n’est présélectionnée. La sélection multiple et les boutons « Tout sélectionner » / « Tout désélectionner » concernent exclusivement cette liste. Une sélection peut inclure des chanteurs sans abonnement Push : la simulation indique combien d’entre eux ne pourront recevoir aucune notification. Tous les appareils abonnés de chaque chanteur sélectionné sont concernés.

## Fichiers et fonctions

| Fichier | Fonction / responsabilité | Pourquoi |
| --- | --- | --- |
| `src/repositories/SaisonRepository.js` | `findActive()` | Recherche une saison active non supprimée ; une configuration avec plusieurs saisons actives produit une erreur. |
| `src/services/SaisonService.js` | `getActive()` | Réutilise le service de saison existant et la lecture stricte du repository ; gère l’absence de saison sans erreur de mapping. |
| `src/services/SaisonChanteurService.js` | `getDestinataires(saisonId)` | Réutilise `getBySaison()` et `SaisonChanteurRepository.findBySaison()`. Exclut les jointures nulles, déduplique les chanteurs et trie Nom / Prénom. Les pages sont lues jusqu’au total exact pour éviter une liste tronquée. Aucun nouveau repository de chanteurs. |
| `src/repositories/SaisonChanteurRepository.js` | `findBySaison(saisonId, pagination)` | Le repository existant fournit une pagination optionnelle et le total exact ; les autres usages conservent leur fonctionnement. |
| `src/services/PushAdminService.js` | `getDestinataires()`, `preparerSelection()`, `simuler()`, `envoyer()` | Orchestre les services existants et centralise la validation et le corps des requêtes, pour conserver exactement la même sélection en simulation et en envoi. |
| `src/pages/admin/notifications/NotificationsAdminPage.jsx` | Chargement, choix multiple, simulation et confirmation | N’effectue aucune requête Supabase directe. Tout changement de texte ou de sélection annule la simulation et la confirmation. |
| `src/pages/admin/notifications/NotificationsAdminPage.css` | Styles `notifications-admin__…` | Conserve le fichier CSS et la nomenclature existants ; liste utilisable sur mobile, labels tactiles et retours à la ligne. |
| `supabase/functions/push-test/PushSubscriptionRepository.ts` | Contrôle de saison, inscriptions et lecture ciblée des abonnements | Le serveur n’accepte pas les identifiants du navigateur sans vérifier le périmètre. Les lectures restent dans le repository existant. |
| `supabase/functions/push-test/index.ts` | Mode `cible: "selection"`, validation et envoi collectif factorisé | Revérifie les droits et les inscriptions lors de chaque simulation et envoi ; refuse une saison devenue inactive ou un destinataire hors périmètre. |

Le repository React `PushAdminRepository` est réutilisé sans modification : il transmet toujours la session via `supabase.functions.invoke("push-test")` et restitue les erreurs serveur.

## Contrat

```json
{
  "cible": "selection",
  "saison_id": "UUID de la saison active chargée",
  "chanteur_ids": ["UUID chanteur 1", "UUID chanteur 2"],
  "titre": "Titre personnalisé",
  "message": "Contenu personnalisé",
  "simulation": true
}
```

L’envoi réel utilise `simulation: false` et exige `confirmation: "ENVOYER_LA_SELECTION"`. La limite existante de 200 appareils est conservée, et la sélection est limitée à 1000 identifiants par requête. La simulation ne transmet aucune notification. L’envoi conserve les compteurs d’acceptation et d’échec ; une acceptation ne garantit ni l’affichage ni la lecture.

Les modes historiques de test individuel et de diffusion `cible: "tous"` restent disponibles pour les appels manuels déjà autorisés. Le formulaire appelle exclusivement `selection`, même pour « Tout sélectionner ».

## Mise en service et validation

Aucune migration SQL ni modification de politique RLS n’est nécessaire. Après récupération du commit et déploiement du frontend, redéployer uniquement la fonction modifiée dans le projet Supabase approprié :

```sh
npx supabase functions deploy push-test --no-verify-jwt
```

Les secrets et l’autorisation administrateur existants restent utilisés. Le déploiement et les envois réels ne sont pas exécutés par les tests de code.

Pour vérifier manuellement :

1. Se connecter comme administrateur ; vérifier la saison et l’ordre Nom / Prénom.
2. Sélectionner un ou plusieurs chanteurs connus, puis simuler. Vérifier le nombre de chanteurs, d’appareils et de chanteurs sans abonnement.
3. Changer la sélection : la simulation précédente et sa confirmation doivent disparaître.
4. Refaire une simulation avant tout envoi réel volontaire. Aucun appareil d’un chanteur non sélectionné ne doit être ciblé.
5. Sur mobile, vérifier les cases à cocher, le défilement de la liste et l’absence de débordement horizontal.

Les tests automatisés utilisent des services / bases / Push simulés. Ils ne contactent aucun appareil ni la base distante. La sélection ne constitue pas encore un historique des messages en BDD.

## Tests reproductibles

```sh
node tests/push-admin-service.test.cjs
node supabase/functions/push-test/selection.test.cjs
npm run build
```

Les tests de services couvrent notamment le tri, la déduplication, les erreurs et la pagination de la liste de saison. Les tests serveur couvrent les autorisations, l’exclusion hors saison, la revalidation au moment de l’envoi, les sélections invalides, les appareils multiples et le plafond avant tout envoi. Le formulaire a été vérifié dans Chromium à 390 pixels de large, sans appel externe et avec des services simulés.

La validation UUID du mode individuel historique a aussi été corrigée : elle utilisait auparavant un groupe de quatre caractères de trop. La même expression est maintenant réutilisée pour les identifiants de sélection et d’abonnement.
