# CLAUDE.md — Mémoire opérationnelle du projet KeyManager

> Ce fichier ne contient que des informations **vérifiées dans le code ou par
> l'exécution**. Les hypothèses sont signalées comme telles.

## Présentation

**KeyManager** est un logiciel de gestion des clés destiné aux agences
immobilières, conçu pour être **vendu à plusieurs agences clientes**.
**Lotier Immobilier est le premier client**, pas le seul destinataire : chaque
décision doit être prise du point de vue d'un produit multi-clients.

Le dépôt contient à la fois le produit et son site commercial (accueil,
fonctionnalités, tarifs, blog, inscription, paiement Stripe).

## Rôles

- **Jerome Bouba** — dirigeant de Lotier Immobilier, décideur final produit et
  métier, pilote le développement en Vibe Coding. Communiquer en français, avec
  pédagogie, sans jargon inutile.
- **Claude / BMAD** — équipe produit et ingénierie virtuelle.

## Stack technique (vérifiée)

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript 5.5 + Vite 5, Tailwind CSS 3, lucide-react |
| Navigation | **Pas de routeur** — `src/App.tsx` lit `window.location.pathname` et intercepte `history.pushState` |
| Backend | Supabase (projet **distinct** de celui de COLLAB/EDL — vérifié le 17/08/2026 : aucune table KeyManager dans le projet COLLAB) |
| Auth | Supabase Auth, flux PKCE, `storageKey: 'keymanager-auth'` (`src/lib/supabase.ts`) |
| Paiement | Stripe (`stripe-checkout`, `stripe-webhook`) |
| QR codes | `qrcode` côté client ; fonctions `qr-info`, `qr-action`, `property-qr-info` |
| SMS | fonction `send-sms` + planificateur `sms-scheduler` (pg_cron) |
| E-mails | fonction `send-email` |

## Chiffres du dépôt (17 août 2026)

- 25 700 lignes TypeScript/TSX, 63 fichiers dans `src/`
- 68 migrations SQL, 13 fonctions serveur
- 26 tables métier

## Commandes

```bash
npm install
npm run dev         # serveur de développement
npm run build       # build production (✅ vert, ~4 s, bundle 986 Ko / 222 Ko gzip)
npm run lint        # eslint (❌ 170 problèmes, dont 131 erreurs)
npm run typecheck   # tsc --noEmit (❌ 74 erreurs)
./supabase/tests/run.sh   # banc d'essai du cloisonnement entre agences
```

**Il n'existe aucun test automatique de l'application** (pas de Vitest, pas de
Jest) et **aucune intégration continue** (pas de `.github/workflows`). Le seul
filet de sécurité actuel est le banc d'essai SQL de `supabase/tests/`.

## Modèle de données — le principe fondateur

Presque toutes les tables métier portent une colonne **`agency_id`**. C'est la
frontière entre clients : `properties`, `keys`, `key_movements`, `contacts`,
`purchase_orders`, `sms_logs`, `agency_announcements`, `agency_settings`,
`agency_options`, `key_qr_codes`, `property_qr_codes`, `qr_scan_logs`,
`subscriptions`, `users`.

Tables volontairement **communes à toutes les agences** : `plans`,
`plan_features`, `sms_templates`, `dashboard_content`, `site_content_sections`,
`blog_articles`.

Identités :
- `users.id` = `auth.users.id` (une ligne `users` par compte Supabase Auth) ;
- `users.role` ∈ `ADMIN`, `COLLAB`, `PRESTATAIRE` (contrainte CHECK) ;
- le super administrateur se repère par la colonne booléenne
  **`users.is_super_admin`** — **jamais** par un rôle `SUPER_ADMIN`, valeur que
  la contrainte interdit et qui a produit 31 règles de sécurité sans effet.

## Règles de sécurité (critiques)

1. **Le cloisonnement entre agences se fait dans la base, jamais dans l'écran.**
   Toute nouvelle table portant des données d'agence doit avoir une politique RLS
   fondée sur `public.current_agency_id()`. Une politique `USING (true)` sur une
   table métier annule le cloisonnement de toutes les autres règles de cette
   table — voir `docs/securite/cloisonnement-agences.md`.
2. **Fonctions d'aide à utiliser** (définies par la migration
   `20260817120000_cloisonnement_agences.sql`) :
   `public.current_agency_id()`, `public.is_super_admin()`,
   `public.is_agency_admin()`. Elles sont en `SECURITY DEFINER` pour éviter la
   récursion RLS sur la table `users`.
3. **Aucun secret dans le dépôt.** Un fichier de secret client Google y a été
   publié sur un dépôt public jusqu'au 17/08/2026 — voir
   `docs/securite/incident-secret-google.md`. `client_secret*.json`, `*.pem`,
   `*.key` et `service-account*.json` sont désormais ignorés par git.
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` font exception : publiques par
   conception, elles ne protègent rien — c'est la RLS qui protège.
4. **Ne jamais élargir une politique à `anon` « pour faire marcher » une requête.**
   Les accès publics légitimes (page de tarifs, scan d'un QR code par un
   visiteur) passent par des politiques ciblées ou par des fonctions serveur.
5. Une fonction de déclencheur qui doit savoir **qui appelle** ne doit pas être en
   `SECURITY DEFINER` : `current_user` y désigne le propriétaire de la fonction,
   pas l'appelant. Erreur commise et corrigée le 17/08/2026.

## Règles de développement

- **Comprendre avant de modifier** : vérifier l'implémentation réelle, pas le nom
  du fichier ni le commentaire de la migration.
- Changements atomiques, sur branche dédiée, avec possibilité de retour arrière.
- Migrations **additives** ; aucune suppression de colonne ou de données sans
  validation explicite de Jerome.
- Ne jamais exécuter sans validation explicite de Jerome : migration sur la base
  de production, modification de données réelles, rotation de secrets,
  changement d'authentification, déploiement.
- Le build doit rester vert ; ne pas aggraver le lint et le typecheck existants.

## Points fragiles connus (17 août 2026)

- **Aucun test applicatif, aucune CI** — priorité haute.
- **74 erreurs TypeScript** et 170 problèmes eslint.
- **18 vulnérabilités npm** dont 12 hautes.
- Bundle non découpé (986 Ko).
- Fichiers très volumineux : `MovementsPage.tsx` (1 637 lignes),
  `KeysCirculationTab.tsx` (1 530), `SuperAdminPage.tsx` (1 507),
  `PropertiesPage.tsx` (1 146).
- **Les migrations ne se rejouent pas de bout en bout** :
  `20251123101123_gentle_bridge.sql` et `20251123101148_winter_term.sql` sont
  deux copies de la même migration Stripe et entrent en conflit. La base n'est
  donc pas reconstructible à partir du dépôt seul sans les ignorer.
- La **prise de contrôle** d'une agence par le super administrateur repose sur
  des indicateurs stockés dans le navigateur (`localStorage`), pas sur une vraie
  session : c'est ce qui oblige à laisser au super administrateur un accès en
  écriture permanent à toutes les agences.

## Erreurs fréquentes à éviter

- Croire qu'une fonctionnalité est protégée parce que l'écran filtre.
- Lire « agency » dans une politique RLS et en conclure que le cloisonnement
  fonctionne : une politique `USING (true)` sur la même table l'annule.
- Utiliser `role = 'SUPER_ADMIN'` : cette valeur ne peut pas exister.
- Ajouter une table métier sans `agency_id` ni politique RLS.
