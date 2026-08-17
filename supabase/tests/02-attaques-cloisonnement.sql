-- Se met dans la peau de l'agent de LOTIER (agence A), tel que le ferait
-- le navigateur avec une session Supabase valide.
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-0000-0000-0000-000000000001';
SET request.jwt.claim.role = 'authenticated';

\echo '--- 1. Clés visibles par l agent LOTIER (attendu après correction : 1)'
SELECT count(*) AS cles_visibles FROM keys;

\echo '--- 2. Détail de ce qu il voit'
SELECT label FROM keys ORDER BY label;

\echo '--- 3. Peut-il modifier la clé de l agence concurrente ? (attendu : 0 ligne)'
UPDATE keys SET label = 'PIRATÉ' WHERE id = 'dddddddd-0000-0000-0000-000000000002';

\echo '--- 4. Peut-il supprimer la clé de l agence concurrente ? (attendu : 0 ligne)'
DELETE FROM keys WHERE id = 'dddddddd-0000-0000-0000-000000000002';

\echo '--- 5. Peut-il lire les comptes des autres agences ? (attendu : 1, le sien)'
SELECT count(*) AS utilisateurs_visibles FROM users;

\echo '--- 6. Peut-il se promouvoir super administrateur ? (attendu : erreur ou 0 ligne)'
UPDATE users SET is_super_admin = true WHERE id = '11111111-0000-0000-0000-000000000001';

\echo '--- 7. Résultat de la tentative de promotion'
SELECT COALESCE(is_super_admin, false) AS est_super_admin
FROM users WHERE id = '11111111-0000-0000-0000-000000000001';

\echo '--- 8. Peut-il changer d agence ? (attendu : erreur ou 0 ligne)'
UPDATE users SET agency_id = 'bbbbbbbb-0000-0000-0000-000000000002'
WHERE id = '11111111-0000-0000-0000-000000000001';

\echo '--- 9. Peut-il supprimer le compte d un autre agent ? (attendu : 0 ligne)'
DELETE FROM users WHERE id = '22222222-0000-0000-0000-000000000002';

\echo '--- 10. Peut-il créer une clé au nom de l agence concurrente ? (attendu : erreur)'
INSERT INTO keys (agency_id, label)
VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'Clé injectée');

RESET ROLE;
