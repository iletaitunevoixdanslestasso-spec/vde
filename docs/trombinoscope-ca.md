# Conseil d'administration dans le trombinoscope

Dans le filtre « Groupe », l'option « Le CA » affiche les choristes ayant une
`fonction_ca_id` pour la saison consultée. Ce filtre ne crée aucun groupe et
conserve les groupes réels et leurs couleurs. Le libellé de la fonction figure
sous l'identité du choriste, dans chaque présentation et à l'impression.

`TrombiAdmin` et `TrombiChanteur` utilisent le même composant `TrombiSaison`.
L'ancienne page `Trombinoscope` réutilise également les mêmes cartes et le même
filtre. L'authentification reste gérée par les services et les Edge Functions.

## Base de données

Aucun SQL supplémentaire n'est nécessaire si la migration
`supabase/migrations/20261105095000_add_fonctions_ca.sql` a déjà été appliquée.
Les fonctions serveur réutilisent sa vue `public.ca_saison`, filtrée par
`saison_id`. Elles enrichissent uniquement les personnes déjà autorisées par le
trombinoscope, sans changer la vue `vue_trombinoscope_saison` ni le RPC
`get_trombinoscope`.

La fonction est envoyée sous les attributs `fonction_ca_id` et `fonction_ca`.
Les deux valent `null` si le choriste n'est pas membre du CA dans cette saison.
Une suppression logique de la saison, du choriste ou de l'affectation est déjà
exclue par `ca_saison`.

## Mise en service

Après récupération de `develop`, redéployer les deux fonctions sur le projet
Supabase correspondant à l'environnement de l'application :

```sh
npx supabase functions deploy trombinoscope-saison --use-api
npx supabase functions deploy get-trombinoscope --use-api
```

Le script existant `publier-prod.bat` redéploie déjà toutes les Edge Functions
lors de la publication en production.

Publier également la nouvelle version du frontend. Un simple déploiement du
frontend ne suffit pas : les fonctions serveur doivent envoyer les attributs
de fonction CA pour que le filtre puisse sélectionner les membres.
