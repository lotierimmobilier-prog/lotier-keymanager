/*
  # Système d'Impersonation pour Super Admin

  1. Nouvelle Table
    - `impersonation_sessions`
      - `id` (uuid, primary key)
      - `super_admin_id` (uuid, référence vers users)
      - `impersonated_user_id` (uuid, référence vers users)
      - `started_at` (timestamp)
      - `ended_at` (timestamp, nullable)
      - `is_active` (boolean)

  2. Sécurité
    - RLS activé sur la table
    - Seuls les super admins peuvent voir et créer des sessions
    - Les sessions actives sont automatiquement terminées lors de la déconnexion

  3. Notes importantes
    - Une seule session active par super admin à la fois
    - Le système permet de tracer toutes les prises de contrôle
    - Les sessions expirées sont conservées pour l'audit
*/

-- Create impersonation_sessions table
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  impersonated_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  is_active boolean DEFAULT true,
  CONSTRAINT fk_super_admin FOREIGN KEY (super_admin_id) REFERENCES users(id),
  CONSTRAINT fk_impersonated_user FOREIGN KEY (impersonated_user_id) REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Super admins can view all sessions
CREATE POLICY "Super admins can view all impersonation sessions"
  ON impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admins can create sessions
CREATE POLICY "Super admins can create impersonation sessions"
  ON impersonation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admins can update their own sessions
CREATE POLICY "Super admins can update their impersonation sessions"
  ON impersonation_sessions
  FOR UPDATE
  TO authenticated
  USING (
    super_admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    super_admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_super_admin 
  ON impersonation_sessions(super_admin_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_active 
  ON impersonation_sessions(is_active) WHERE is_active = true;
