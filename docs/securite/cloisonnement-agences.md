# Cloisonner les agences — ce qui était en jeu et ce qui a été fait

**Date :** 17 août 2026
**Migration concernée :** `supabase/migrations/20260817120000_cloisonnement_agences.sql`
**Banc d'essai :** `supabase/tests/` (voir le README de ce dossier)

## En une phrase

Jusqu'ici, n'importe quel utilisateur connecté de n'importe quelle agence pouvait
voir et modifier les données de toutes les autres agences — et se donner les
droits de super administrateur. Ce n'est plus le cas.

## Pourquoi c'est le sujet numéro un

KeyManager doit être vendu à plusieurs agences. Chacune y déposera les clés de
ses biens, les coordonnées de ses locataires et l'historique de qui détient quoi.
La première question d'un client sera : *« l'agence d'à côté peut-elle voir mes
données ? »*

Tant que la réponse n'est pas un « non » démontrable, le produit n'est pas
vendable — et un incident chez le deuxième client serait une violation de
données personnelles au sens du RGPD.

## Ce qui n'allait pas

### Le cloisonnement reposait sur l'écran, pas sur la base

Une migration de novembre 2025 (`20251116072525_simplify_all_rls_policies.sql`)
a remplacé les règles de sécurité de la base par une règle unique : « tout
utilisateur connecté a accès à tout ». Son commentaire assume le choix :
*« Application enforces agency boundaries »* — c'est l'application qui filtre.

Le raisonnement paraît tenir : l'écran n'affiche que les clés de votre agence.
Mais l'application est du code JavaScript qui s'exécute **dans le navigateur du
client**. Il est modifiable, et la base répond directement aux requêtes qu'on lui
envoie. Le filtre est une politesse, pas une serrure.

Ce changement avait une raison réelle : les anciennes règles provoquaient une
« récursion infinie » (pour savoir si vous avez le droit de lire la table des
utilisateurs, la base devait lire la table des utilisateurs…). La solution
retenue a été de tout ouvrir. La bonne solution existait : une fonction d'aide
qui répond à la question « quelle est mon agence ? » sans repasser par le
contrôle d'accès. C'est ce qui a été mis en place.

### Le détail qui rendait le problème invisible

Les bonnes règles n'avaient pas disparu. « Users can view keys in their agency »
existait toujours. Mais PostgreSQL **additionne** les autorisations : si une
règle dit « chacun voit son agence » et qu'une autre dit « tout le monde voit
tout », le résultat est « tout le monde voit tout ».

On pouvait donc lire le code des règles, y voir le mot « agency », et conclure à
tort que le cloisonnement était en place.

### Le compte super administrateur ne fonctionnait pas non plus

31 règles accordaient des droits étendus à un utilisateur dont le rôle vaut
`SUPER_ADMIN`. Or la table des utilisateurs n'autorise que trois rôles —
`ADMIN`, `COLLAB`, `PRESTATAIRE` — et l'application repère le super
administrateur par une colonne différente (`is_super_admin`).

Ces 31 règles ne pouvaient donc jamais s'appliquer. Personne ne s'en apercevait,
puisque « tout le monde voit tout » donnait déjà tous les droits. En refermant
la base sans réparer ce point, on aurait privé le super administrateur d'accès
aux agences clientes.

## Ce qui a été démontré

Sur une copie locale du schéma (jamais sur la production), un agent de l'agence A
a tenté dix accès aux données de l'agence B.

| # | Tentative | Avant | Après |
|---|---|---|---|
| 1 | Lire les clés de l'autre agence | ✅ réussie | ⛔ bloquée |
| 2 | Voir leur libellé | ✅ réussie | ⛔ bloquée |
| 3 | Modifier une de leurs clés | ✅ réussie | ⛔ bloquée |
| 4 | Supprimer une de leurs clés | ✅ réussie | ⛔ bloquée |
| 5 | Lire la liste de leurs utilisateurs | ✅ réussie | ⛔ bloquée |
| 6 | **Se promouvoir super administrateur** | ✅ réussie | ⛔ bloquée |
| 7 | (vérification du résultat de 6) | privilège obtenu | privilège refusé |
| 8 | Changer son agence de rattachement | ✅ réussie | ⛔ bloquée |
| 9 | Supprimer le compte d'un de leurs agents | ✅ réussie | ⛔ bloquée |
| 10 | Créer une clé à leur nom | ✅ réussie | ⛔ bloquée |

La ligne 6 est la plus grave : elle transformait n'importe quel titulaire de
compte en administrateur de la totalité du produit.

## Ce qui continue de fonctionner

Fermer une porte ne sert à rien si l'on enferme les occupants. Chaque profil a
donc été rejoué :

| Profil | Vérifications | Résultat |
|---|---|---|
| Agent (COLLAB) | voir, créer, modifier, supprimer clés, biens, mouvements, contacts ; modifier son profil ; consulter les tarifs | 9/9 ✅ |
| Administrateur d'agence | modifier son agence, créer/bannir/supprimer un collaborateur, publier une annonce | 5/5 ✅ + refus correct de créer un compte dans une autre agence |
| Super administrateur | voir toutes les agences, tous les utilisateurs, intervenir sur une agence cliente, promouvoir un utilisateur | 5/5 ✅ |
| Fonctions serveur (`complete-signup`, `create-admin`…) | rattacher un utilisateur, promouvoir, lire toutes les agences | 3/3 ✅ |

## Deux points qui demandent votre décision

### 1. Le super administrateur garde l'accès en écriture à toutes les agences

C'est le comportement actuel du produit : l'écran « Super Admin » et le mode
« prise de contrôle » permettent d'agir sur le compte d'une agence cliente. Ce
mode repose sur des indicateurs stockés dans le navigateur ; la session reste
celle du super administrateur. Limiter ce droit à la lecture casserait la prise
de contrôle.

C'est un privilège assumé, désormais réellement contrôlé par la base et non plus
par l'écran. Les prises de contrôle sont déjà journalisées dans la table
`impersonation_sessions`.

*À terme, une prise de contrôle qui délivrerait une vraie session de l'agence
concernée (plutôt qu'un indicateur dans le navigateur) permettrait de retirer ce
privilège permanent. C'est un chantier à part entière.*

### 2. Un utilisateur banni perd tout accès

Le bannissement n'était vérifié que par l'écran. Les fonctions d'aide renvoient
désormais « aucune agence » pour un utilisateur banni : il ne voit plus rien,
même en contournant l'interface. C'est le comportement attendu, mais il devient
strict — un bannissement par erreur coupe l'accès immédiatement.

## Comment vérifier

```bash
./supabase/tests/run.sh          # avec la correction : 10 refus, usages OK
./supabase/tests/run.sh --sans   # sans elle : 10 réussites, la fuite est visible
```

Après application sur la vraie base, à vérifier dans le navigateur :

1. connexion d'un agent LOTIER : ses clés, ses biens et ses contacts s'affichent ;
2. sortie et retour d'une clé : le mouvement s'enregistre ;
3. connexion d'un administrateur : création puis suppression d'un collaborateur ;
4. connexion du super administrateur : l'écran « Super Admin » liste les agences,
   et la prise de contrôle fonctionne ;
5. inscription d'une nouvelle agence depuis le site : le compte est bien créé.

## Réversibilité

La migration ne supprime aucune donnée et ne modifie aucune colonne : elle ne
touche que des règles d'accès, des fonctions et un déclencheur. Un retour arrière
consiste à recréer les règles retirées (elles sont listées explicitement dans la
section 2 du fichier de migration).
