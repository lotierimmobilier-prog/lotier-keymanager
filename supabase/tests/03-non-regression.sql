-- Vérifie que les usages légitimes de l'application restent possibles.
-- Chaque bloc se met dans la peau d'un profil réel.

\echo '========== A. AGENT (rôle COLLAB) de LOTIER =========='
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-0000-0000-0000-000000000001';

\echo '-- A1. Voir les clés de son agence (attendu : 1)'
SELECT count(*) FROM keys;

\echo '-- A2. Créer une clé dans son agence (attendu : INSERT 1)'
INSERT INTO keys (agency_id, label)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Nouvelle clé LOTIER');

\echo '-- A3. Modifier une clé de son agence (attendu : UPDATE 1)'
UPDATE keys SET status = 'OUT'
WHERE id = 'cccccccc-0000-0000-0000-000000000001';

\echo '-- A4. Créer un bien puis un mouvement de clé (attendu : INSERT 1 puis 1)'
INSERT INTO properties (id, agency_id, reference, address, type)
VALUES ('eeeeeeee-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001', 'REF-001',
        '12 rue de la Paix', 'APPARTEMENT');

INSERT INTO key_movements (agency_id, key_id, given_to_name, expected_return_at)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000001', 'M. Dupont', now() + interval '2 days');

\echo '-- A5. Créer un contact (attendu : INSERT 1)'
INSERT INTO contacts (agency_id, first_name, last_name)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Jean', 'Dupont');

\echo '-- A6. Voir son agence (attendu : 1)'
SELECT count(*) FROM agencies;

\echo '-- A7. Modifier son propre prénom (attendu : UPDATE 1)'
UPDATE users SET first_name = 'Agent modifié'
WHERE id = '11111111-0000-0000-0000-000000000001';

\echo '-- A8. Supprimer une clé de son agence (attendu : DELETE 1)'
DELETE FROM keys WHERE label = 'Nouvelle clé LOTIER';

\echo '-- A9. Consulter les offres tarifaires (page publique, attendu : > 0)'
SELECT count(*) > 0 AS offres_visibles FROM plans;

RESET ROLE;

\echo ''
\echo '========== B. ADMINISTRATEUR de LOTIER =========='
RESET request.jwt.claim.sub;
UPDATE users SET role = 'ADMIN'
WHERE id = '11111111-0000-0000-0000-000000000001';

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-0000-0000-0000-000000000001';

\echo '-- B1. Modifier les informations de son agence (attendu : UPDATE 1)'
UPDATE agencies SET address = '1 avenue des Clés'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';

\echo '-- B2. Créer un compte dans son agence (attendu : INSERT 1)'
RESET ROLE;
INSERT INTO auth.users (id, email)
VALUES ('33333333-0000-0000-0000-000000000003', 'nouveau@lotier.fr');
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-0000-0000-0000-000000000001';

INSERT INTO users (id, agency_id, first_name, last_name, email, role)
VALUES ('33333333-0000-0000-0000-000000000003',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Nouveau', 'Collaborateur', 'nouveau@lotier.fr', 'COLLAB');

\echo '-- B3. Bannir un collaborateur de son agence (attendu : UPDATE 1)'
UPDATE users SET is_banned = true
WHERE id = '33333333-0000-0000-0000-000000000003';

\echo '-- B4. Supprimer ce compte (attendu : DELETE 1)'
DELETE FROM users WHERE id = '33333333-0000-0000-0000-000000000003';

\echo '-- B5. Créer une annonce d agence (attendu : INSERT 1)'
INSERT INTO agency_announcements (agency_id, title, content, type, created_by)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Info', 'Message interne', 'INFO',
        '11111111-0000-0000-0000-000000000001');

\echo '-- B6. Ne doit PAS pouvoir créer un compte dans une autre agence (attendu : erreur)'
INSERT INTO users (id, agency_id, first_name, last_name, email, role)
VALUES ('44444444-0000-0000-0000-000000000004',
        'bbbbbbbb-0000-0000-0000-000000000002',
        'Intrus', 'Test', 'intrus@test.fr', 'ADMIN');

RESET ROLE;

\echo ''
\echo '========== C. SUPER ADMINISTRATEUR =========='
INSERT INTO auth.users (id, email)
VALUES ('99999999-0000-0000-0000-000000000009', 'super@keymanager.fr');
INSERT INTO users (id, agency_id, first_name, last_name, email, role, is_super_admin)
VALUES ('99999999-0000-0000-0000-000000000009',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Super', 'Admin', 'super@keymanager.fr', 'ADMIN', true);

SET ROLE authenticated;
SET request.jwt.claim.sub = '99999999-0000-0000-0000-000000000009';

\echo '-- C1. Voir les clés de TOUTES les agences (attendu : 2)'
SELECT count(*) FROM keys;

\echo '-- C2. Voir toutes les agences (attendu : 2)'
SELECT count(*) FROM agencies;

\echo '-- C3. Voir tous les utilisateurs (attendu : 3)'
SELECT count(*) FROM users;

\echo '-- C4. Intervenir sur une agence cliente — prise de contrôle (attendu : UPDATE 1)'
UPDATE keys SET status = 'AVAILABLE'
WHERE id = 'dddddddd-0000-0000-0000-000000000002';

\echo '-- C5. Promouvoir un utilisateur super administrateur (attendu : UPDATE 1)'
UPDATE users SET is_super_admin = true
WHERE id = '22222222-0000-0000-0000-000000000002';

RESET ROLE;

\echo ''
\echo '========== D. FONCTION SERVEUR (clé service_role) =========='
-- Reproduit ce que font les fonctions `complete-signup`, `create-admin`,
-- `update-user-email` : elles agissent avec la clé service_role, sans identité
-- applicative. Elles doivent rester capables d administrer les comptes.
SET ROLE service_role;
RESET request.jwt.claim.sub;

\echo '-- D1. Rattacher un utilisateur a une autre agence (attendu : UPDATE 1)'
UPDATE users SET agency_id = 'bbbbbbbb-0000-0000-0000-000000000002'
WHERE id = '22222222-0000-0000-0000-000000000002';

\echo '-- D2. Promouvoir un utilisateur super administrateur (attendu : UPDATE 1)'
UPDATE users SET is_super_admin = true
WHERE id = '22222222-0000-0000-0000-000000000002';

\echo '-- D3. Lire toutes les agences (attendu : 2)'
SELECT count(*) FROM agencies;

RESET ROLE;
