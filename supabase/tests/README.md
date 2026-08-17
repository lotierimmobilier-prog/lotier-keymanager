# Banc d'essai du cloisonnement entre agences

KeyManager est destiné à plusieurs agences clientes. La question la plus
importante que posera un client est simple : **« mes clés et mes locataires
sont-ils invisibles pour les autres agences ? »**

Ce dossier permet d'y répondre par une démonstration, pas par une promesse.

## Ce que ça fait

Le script reconstruit une copie du schéma KeyManager sur un PostgreSQL local
— jamais sur la base de production — y crée deux agences fictives, puis :

1. **`02-attaques-cloisonnement.sql`** se met dans la peau d'un agent de
   l'agence A et tente dix accès aux données de l'agence B. Les dix doivent
   échouer.
2. **`03-non-regression.sql`** vérifie que les usages normaux fonctionnent
   toujours : un agent gère ses clés, un administrateur gère son agence et ses
   collaborateurs, le super administrateur voit tout, et les fonctions serveur
   continuent d'administrer les comptes.

## Comment le lancer

```bash
# Un PostgreSQL local doit écouter (ici : port 5433, utilisateur postgres)
./supabase/tests/run.sh

# Pour voir le problème tel qu'il existait avant correction :
./supabase/tests/run.sh --sans
```

## Résultat de référence (17 août 2026)

Sans la migration `20260817120000_cloisonnement_agences.sql`, **les dix
tentatives réussissent** : l'agent de l'agence A lit, modifie et supprime les
clés de l'agence B, lit tous les comptes, se promeut super administrateur,
change d'agence et supprime le compte d'un collègue d'une autre agence.

Avec la migration, **les dix échouent**, et les usages légitimes des quatre
profils (agent, administrateur d'agence, super administrateur, fonction serveur)
continuent tous de fonctionner.

## Limites à connaître

- Le décor `00-decor-supabase.sql` **imite** l'environnement Supabase (schéma
  `auth`, fonction `auth.uid()`, rôles `anon`/`authenticated`/`service_role`).
  Il est fidèle sur le mécanisme des politiques RLS, mais ce n'est pas Supabase :
  Supabase Auth, le stockage de fichiers et `pg_cron` ne sont pas reproduits.
- Cinq migrations ne se rejouent pas hors Supabase (buckets de stockage,
  `pg_cron`, et deux migrations Stripe en double —
  `20251123101123_gentle_bridge.sql` et `20251123101148_winter_term.sql` — qui
  créent deux fois les mêmes objets). Le script les ignore.
- Ce banc valide les **règles de la base**. Il ne remplace pas un test de
  l'application dans un navigateur.
