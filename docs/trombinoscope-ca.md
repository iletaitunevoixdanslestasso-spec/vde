# Conseil d'administration dans le trombinoscope

Dans le filtre « Groupe », l'option « Le CA » affiche les choristes ayant une
`fonction_ca_id` pour la saison consultée. Ce filtre ne crée aucun groupe et
conserve les groupes réels et leurs couleurs. Le libellé de la fonction figure
sous l'identité du choriste, dans chaque présentation et à l'impression.
Dans le filtre « Le CA », les choristes sont classés par ordre croissant de la
fonction, puis par nom et prénom en cas d'égalité. Les autres filtres conservent
leur classement alphabétique.

L'ordre se modifie dans « Référentiels → Fonctions du CA ». C'est un entier
positif ou nul ; plusieurs fonctions peuvent avoir le même ordre. La valeur par
défaut est `1000`. La migration initialise président à `1`, secrétaire à `2` et
trésorier à `3`.

`TrombiAdmin` et `TrombiChanteur` utilisent le même composant `TrombiSaison`.
L'ancienne page `Trombinoscope` réutilise également les mêmes cartes et le même
filtre. L'authentification reste gérée par les services et les Edge Functions.

## Base de données

Le référentiel et la vue sont créés par la migration
`supabase/migrations/20261105095000_add_fonctions_ca.sql`.
Appliquer ensuite `supabase/migrations/20261105110000_add_ordre_fonction_ca.sql`
pour ajouter le champ `ordre` et l'exposer dans la vue existante.
Les fonctions serveur utilisent cette vue `public.ca_saison`, filtrée par
`saison_id`. Elles enrichissent uniquement les personnes déjà autorisées par le
trombinoscope, sans changer la vue `vue_trombinoscope_saison` ni le RPC
`get_trombinoscope`.

La fonction est envoyée sous les attributs `fonction_ca_id`, `fonction_ca` et
`fonction_ca_ordre`. Tous valent `null` si le choriste n'est pas membre du CA
dans cette saison.
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
