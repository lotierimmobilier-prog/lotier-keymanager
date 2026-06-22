/*
  # Système de Bons de Commande et Validation

  1. Nouvelle Table
    - `purchase_orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique) - Numéro de commande auto-généré
      - `agency_id` (uuid, référence vers agencies)
      - `plan_id` (uuid, référence vers plans)
      - `requested_by_user_id` (uuid, référence vers users)
      - `status` (text) - pending, approved, rejected, cancelled
      - `requested_keys_limit` (integer) - Nombre de clés demandées
      - `total_amount` (numeric) - Montant total
      - `notes` (text) - Notes de la demande
      - `rejection_reason` (text) - Raison du rejet si applicable
      - `approved_by_admin_id` (uuid, référence vers users)
      - `approved_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - RLS activé
    - Les utilisateurs peuvent voir les bons de leur agence
    - Les admins d'agence peuvent créer des bons de commande
    - Les super admins peuvent voir et valider tous les bons

  3. Fonctionnalités
    - Génération automatique de numéro de commande
    - Historique complet des demandes
    - Workflow de validation
*/

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id),
  requested_by_user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_keys_limit integer NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  notes text,
  rejection_reason text,
  approved_by_admin_id uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  new_number text;
  exists boolean;
BEGIN
  LOOP
    new_number := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM purchase_orders WHERE order_number = new_number) INTO exists;
    
    IF NOT exists THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Trigger to update updated_at
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Users can view purchase orders from their agency
CREATE POLICY "Users can view their agency purchase orders"
  ON purchase_orders
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT users.agency_id
      FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Admins can create purchase orders for their agency
CREATE POLICY "Admins can create purchase orders"
  ON purchase_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT users.agency_id
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Admins can update their agency's pending purchase orders
CREATE POLICY "Admins can update pending purchase orders"
  ON purchase_orders
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND agency_id IN (
      SELECT users.agency_id
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    status = 'pending'
    AND agency_id IN (
      SELECT users.agency_id
      FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Super admins can view all purchase orders
CREATE POLICY "Super admins can view all purchase orders"
  ON purchase_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Super admins can update all purchase orders (for approval/rejection)
CREATE POLICY "Super admins can update all purchase orders"
  ON purchase_orders
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_agency 
  ON purchase_orders(agency_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status 
  ON purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at 
  ON purchase_orders(created_at DESC);
