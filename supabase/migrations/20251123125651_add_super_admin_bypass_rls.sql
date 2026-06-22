/*
  # Autoriser les Super Admins à Voir Toutes les Données

  1. Modifications des Politiques RLS
    - Ajouter des politiques permettant aux super admins de voir toutes les données
    - Les super admins peuvent accéder à toutes les agences et leurs données
    - Cela permet le mode impersonation

  2. Sécurité
    - Seuls les utilisateurs avec `is_super_admin = true` obtiennent cet accès
    - Les utilisateurs normaux continuent à utiliser les politiques existantes
*/

-- Super admin peut voir toutes les agences
CREATE POLICY "Super admins can view all agencies"
  ON agencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admin peut voir toutes les propriétés
CREATE POLICY "Super admins can view all properties"
  ON properties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admin peut voir toutes les clés
CREATE POLICY "Super admins can view all keys"
  ON keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admin peut voir tous les mouvements
CREATE POLICY "Super admins can view all movements"
  ON key_movements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admin peut voir tous les contacts
CREATE POLICY "Super admins can view all contacts"
  ON contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );
