# Incident de sécurité — secret client Google publié

**Date de détection :** 17 août 2026
**Détecté par :** revue initiale du dépôt (équipe d'ingénierie virtuelle Claude/BMAD)
**Gravité :** élevée

> Ce document ne contient **aucun secret**. Il décrit l'emplacement du problème et
> les mesures à prendre.

## Ce qui s'est passé

Le fichier `supabase/client_secret_<identifiant>.apps.googleusercontent.com.json`
était versionné à la racine du dossier `supabase/` du dépôt
`lotierimmobilier-prog/lotier-keymanager`, **dépôt public sur GitHub**.

Ce fichier est le fichier d'identifiants généré par la Google Cloud Console pour
un client OAuth de type « web ». Il contient, entre autres, la valeur
`client_secret` : la preuve d'identité que Google attend d'une application
lorsqu'elle demande l'accès au compte d'un utilisateur.

Il était donc lisible par n'importe qui, sans authentification, depuis la mise en
ligne du dépôt (dernier commit connu : 23 juin 2026).

## Pourquoi c'est un problème

Avec le `client_id` et le `client_secret`, un tiers peut faire passer sa propre
application pour la vôtre auprès de Google : une page de consentement affichant
votre nom, votre logo et les autorisations que vous demandez. L'utilisateur qui
accepte croit autoriser LOTIER ; il autorise en réalité l'attaquant.

L'exposition est atténuée par les `redirect_uris` déclarés (Google refuse de
renvoyer un jeton vers une adresse non enregistrée), mais ce n'est pas une
protection sur laquelle s'appuyer : ces adresses peuvent être détournées, et le
secret peut servir à d'autres flux OAuth.

## Mesures

| # | Mesure | Responsable | Statut |
|---|---|---|---|
| 1 | **Régénérer le secret client** dans Google Cloud Console → API et services → Identifiants | Jerome Bouba | ⬜ à faire |
| 2 | Retirer le fichier du code source | Claude | ✅ fait (cette branche) |
| 3 | Ajouter `client_secret*.json` et assimilés au `.gitignore` | Claude | ✅ fait (cette branche) |
| 4 | Passer le dépôt en privé (Settings → General → Danger Zone → Change visibility) | Jerome Bouba | ⬜ à faire |
| 5 | Stocker le secret dans les secrets Supabase, jamais dans le code | Jerome Bouba | ⬜ à faire |

**La mesure 1 est la seule qui referme réellement la porte.** Retirer un fichier
d'un dépôt ne l'efface pas de l'historique Git : n'importe qui ayant cloné le
dépôt, ou consultant un commit ancien, peut encore lire l'ancienne valeur. Tant
que le secret n'est pas régénéré côté Google, il faut le considérer comme connu
de tiers.

Passer le dépôt en privé (mesure 4) réduit l'exposition future mais ne fait rien
contre les copies déjà réalisées.

## Règle à retenir

Aucun secret ne doit vivre dans le code source : ni clé d'API, ni mot de passe,
ni fichier d'identifiants téléchargé depuis une console fournisseur. Leur place
est dans les **secrets Supabase** (pour les fonctions serveur) ou dans un fichier
`.env` local, jamais versionné.

Les valeurs `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` font exception : elles
sont publiques par conception, embarquées dans le code envoyé au navigateur. Leur
protection ne vient pas du secret mais des règles de sécurité de la base (RLS).
