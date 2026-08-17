-- Jeu d'essai : deux agences, deux utilisateurs, deux clés.
-- Agence A = LOTIER (le premier client), agence B = un futur client.

INSERT INTO agencies (id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'LOTIER Immobilier'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Agence Concurrente');

INSERT INTO auth.users (id, email) VALUES
  ('11111111-0000-0000-0000-000000000001', 'agent@lotier.fr'),
  ('22222222-0000-0000-0000-000000000002', 'agent@concurrente.fr');

INSERT INTO users (id, agency_id, first_name, last_name, email, role) VALUES
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Agent', 'Lotier', 'agent@lotier.fr', 'COLLAB'),
  ('22222222-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Agent', 'Concurrent', 'agent@concurrente.fr', 'COLLAB');

INSERT INTO keys (id, agency_id, label) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Clé appartement LOTIER'),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Clé appartement Concurrente');
