/*
  # Gestion des Fonctionnalités des Plans

  1. Nouvelle Table
    - `plan_features`
      - `id` (uuid, primary key)
      - `plan_id` (uuid, référence vers plans)
      - `feature_name` (text) - Nom de la fonctionnalité
      - `feature_description` (text) - Description détaillée
      - `is_included` (boolean) - Si inclus dans ce plan
      - `display_order` (integer) - Ordre d'affichage
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - RLS activé
    - Tout le monde peut voir les fonctionnalités (public)
    - Seuls les super admins peuvent modifier

  3. Fonctionnalités
    - Permet de gérer dynamiquement les fonctionnalités affichées
    - Peut être mis à jour sans modifier le code
*/

-- Create plan_features table
CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  feature_description text,
  is_included boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to update updated_at
CREATE TRIGGER update_plan_features_updated_at
  BEFORE UPDATE ON plan_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Anyone can view plan features (public info)
CREATE POLICY "Anyone can view plan features"
  ON plan_features
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Super admins can insert plan features
CREATE POLICY "Super admins can insert plan features"
  ON plan_features
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admins can update plan features
CREATE POLICY "Super admins can update plan features"
  ON plan_features
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admins can delete plan features
CREATE POLICY "Super admins can delete plan features"
  ON plan_features
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id 
  ON plan_features(plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_features_display_order 
  ON plan_features(display_order);

-- Insert default features for existing plans
DO $$
DECLARE
  plan_gratuit_id uuid;
  plan_team_id uuid;
  plan_business_id uuid;
  plan_business_plus_id uuid;
  plan_corporate_id uuid;
BEGIN
  SELECT id INTO plan_gratuit_id FROM plans WHERE name = 'Gratuit';
  SELECT id INTO plan_team_id FROM plans WHERE name = 'Team';
  SELECT id INTO plan_business_id FROM plans WHERE name = 'Business';
  SELECT id INTO plan_business_plus_id FROM plans WHERE name = 'Business+';
  SELECT id INTO plan_corporate_id FROM plans WHERE name = 'Corporate';

  IF plan_gratuit_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_name, feature_description, display_order) VALUES
    (plan_gratuit_id, 'Jusqu''à 3 clés', 'Gérez jusqu''à 3 clés simultanément', 1),
    (plan_gratuit_id, 'Mouvements illimités', 'Historique complet de tous vos mouvements', 2),
    (plan_gratuit_id, 'Alertes SMS', 'Recevez des alertes par SMS', 3),
    (plan_gratuit_id, '1 utilisateur', 'Un compte administrateur', 4);
  END IF;

  IF plan_team_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_name, feature_description, display_order) VALUES
    (plan_team_id, 'Jusqu''à 10 clés', 'Gérez jusqu''à 10 clés simultanément', 1),
    (plan_team_id, 'Toutes les fonctionnalités', 'Accès complet à toutes les fonctions', 2),
    (plan_team_id, 'Utilisateurs illimités', 'Ajoutez autant d''utilisateurs que nécessaire', 3),
    (plan_team_id, 'Support email', 'Support par email sous 48h', 4),
    (plan_team_id, '7 jours d''essai gratuit', 'Testez sans engagement', 5);
  END IF;

  IF plan_business_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_name, feature_description, display_order) VALUES
    (plan_business_id, 'Jusqu''à 20 clés', 'Gérez jusqu''à 20 clés simultanément', 1),
    (plan_business_id, 'Toutes les fonctionnalités', 'Accès complet à toutes les fonctions', 2),
    (plan_business_id, 'Utilisateurs illimités', 'Ajoutez autant d''utilisateurs que nécessaire', 3),
    (plan_business_id, 'Support prioritaire', 'Support par email sous 24h', 4),
    (plan_business_id, 'Personnalisation avancée', 'Logo et couleurs personnalisés', 5),
    (plan_business_id, '7 jours d''essai gratuit', 'Testez sans engagement', 6);
  END IF;

  IF plan_business_plus_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_name, feature_description, display_order) VALUES
    (plan_business_plus_id, 'Jusqu''à 50 clés', 'Gérez jusqu''à 50 clés simultanément', 1),
    (plan_business_plus_id, 'Toutes les fonctionnalités', 'Accès complet à toutes les fonctions', 2),
    (plan_business_plus_id, 'Utilisateurs illimités', 'Ajoutez autant d''utilisateurs que nécessaire', 3),
    (plan_business_plus_id, 'Support prioritaire', 'Support par email sous 12h', 4),
    (plan_business_plus_id, 'API complète', 'Intégration avec vos outils', 5),
    (plan_business_plus_id, 'Formation incluse', '1h de formation personnalisée', 6),
    (plan_business_plus_id, '7 jours d''essai gratuit', 'Testez sans engagement', 7);
  END IF;

  IF plan_corporate_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_name, feature_description, display_order) VALUES
    (plan_corporate_id, 'Clés illimitées', 'Aucune limite sur le nombre de clés', 1),
    (plan_corporate_id, 'Toutes les fonctionnalités', 'Accès complet à toutes les fonctions', 2),
    (plan_corporate_id, 'Utilisateurs illimités', 'Ajoutez autant d''utilisateurs que nécessaire', 3),
    (plan_corporate_id, 'Support dédié 24/7', 'Support téléphonique et email prioritaire', 4),
    (plan_corporate_id, 'API complète', 'Intégration avec vos outils', 5),
    (plan_corporate_id, 'Formation incluse', 'Formation illimitée pour votre équipe', 6),
    (plan_corporate_id, 'Account Manager dédié', 'Un responsable de compte attitré', 7),
    (plan_corporate_id, '7 jours d''essai gratuit', 'Testez sans engagement', 8);
  END IF;
END $$;
