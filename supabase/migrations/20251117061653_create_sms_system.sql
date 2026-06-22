/*
  # Création du système SMS OVH

  1. Nouvelle table `sms_templates`
    - `id` (uuid, clé primaire)
    - `code` (text, unique) - Identifiant du template ('key_taken', 'key_due_2h', 'key_overdue')
    - `label` (text) - Libellé descriptif
    - `content` (text) - Contenu du SMS avec variables {{variable}}
    - `enabled` (boolean) - Activation/désactivation du template
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Nouvelle table `sms_logs`
    - `id` (uuid, clé primaire)
    - `agency_id` (uuid, référence agencies)
    - `contact_id` (uuid, nullable, référence contacts)
    - `movement_id` (uuid, nullable, référence key_movements)
    - `type` (text) - Type de SMS ('key_taken', 'key_due_2h', 'key_overdue')
    - `to_phone` (text) - Numéro de téléphone destinataire
    - `message` (text) - Contenu du SMS envoyé
    - `status` (text) - Statut ('sent', 'error')
    - `error_message` (text, nullable) - Message d'erreur éventuel
    - `created_at` (timestamptz)

  3. Modifications sur `key_movements`
    - Ajout `sms_taken_sent` (boolean, défaut false)
    - Ajout `sms_due_2h_sent` (boolean, défaut false)
    - Ajout `sms_overdue_sent` (boolean, défaut false)
    - Ajout `disable_sms` (boolean, défaut false)
    - Ajout `contact_phone` (text, nullable) - Téléphone du contact

  4. Modifications sur `contacts`
    - Ajout `sms_opt_out` (boolean, défaut false)

  5. Sécurité
    - RLS activé sur toutes les nouvelles tables
    - Politiques restrictives basées sur l'agence
*/

-- Table des templates SMS
CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  content text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all SMS templates"
  ON sms_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "All authenticated users can view SMS templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (true);

-- Insertion des templates par défaut
INSERT INTO sms_templates (code, label, content, enabled) VALUES
  ('key_taken', 'Confirmation de sortie de clé', 'Bonjour {{prenom}}, vous avez pris la clé {{reference_cle}} le {{date_prise}} à {{heure_prise}}. Retour prévu : {{date_retour}} à {{heure_retour}}. {{nom_agence}}', true),
  ('key_due_2h', 'Rappel retour de clé (2h avant)', 'Bonjour {{prenom}}, rappel : la clé {{reference_cle}} doit être rendue aujourd''hui à {{heure_retour}}. Merci. {{nom_agence}}', true),
  ('key_overdue', 'Clé en retard', 'Bonjour {{prenom}}, la clé {{reference_cle}} devait être rendue le {{date_retour}} à {{heure_retour}}. Merci de nous la restituer rapidement. {{nom_agence}}', true)
ON CONFLICT (code) DO NOTHING;

-- Table des logs SMS
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  movement_id uuid REFERENCES key_movements(id) ON DELETE SET NULL,
  type text NOT NULL,
  to_phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'sent',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SMS logs in their agency"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert SMS logs in their agency"
  ON sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Ajout des champs SMS sur key_movements
ALTER TABLE key_movements
ADD COLUMN IF NOT EXISTS sms_taken_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_due_2h_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_overdue_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS disable_sms boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Ajout du champ opt-out sur contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS sms_opt_out boolean DEFAULT false;

-- Index pour optimiser les requêtes du job planifié
CREATE INDEX IF NOT EXISTS idx_key_movements_sms_due ON key_movements(expected_return_at, returned_at, sms_due_2h_sent, disable_sms) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_key_movements_sms_overdue ON key_movements(expected_return_at, returned_at, sms_overdue_sent, disable_sms) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sms_logs_movement ON sms_logs(movement_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_agency ON sms_logs(agency_id, created_at DESC);
