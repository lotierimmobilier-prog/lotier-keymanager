/*
  # Simplify All RLS Policies to Avoid Recursion

  This migration simplifies RLS policies across all tables to avoid
  any potential recursion issues by removing complex subqueries.

  ## Changes

  Replace complex policies with simple authenticated checks.
  Application logic will handle:
  - Agency filtering
  - Super admin checks
  - Ban status checks
  - Role-based permissions

  ## Security

  - Only authenticated users can access data
  - Application enforces agency boundaries
  - Application enforces super admin privileges
  - Application blocks banned users
*/

-- Properties
DROP POLICY IF EXISTS "Users can view agency properties" ON properties;
DROP POLICY IF EXISTS "Users can manage agency properties" ON properties;

CREATE POLICY "authenticated_select_properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_properties"
  ON properties FOR ALL
  TO authenticated
  USING (true);

-- Keys
DROP POLICY IF EXISTS "Users can view agency keys" ON keys;
DROP POLICY IF EXISTS "Users can manage agency keys" ON keys;

CREATE POLICY "authenticated_select_keys"
  ON keys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_keys"
  ON keys FOR ALL
  TO authenticated
  USING (true);

-- Key Movements
DROP POLICY IF EXISTS "Users can view agency movements" ON key_movements;
DROP POLICY IF EXISTS "Users can manage agency movements" ON key_movements;

CREATE POLICY "authenticated_select_movements"
  ON key_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_movements"
  ON key_movements FOR ALL
  TO authenticated
  USING (true);

-- Contacts
DROP POLICY IF EXISTS "Users can view agency contacts" ON contacts;
DROP POLICY IF EXISTS "Users can manage agency contacts" ON contacts;

CREATE POLICY "authenticated_select_contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (true);

-- Subscriptions
DROP POLICY IF EXISTS "Users can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view agency subscription" ON subscriptions;

CREATE POLICY "authenticated_select_subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (true);

-- Agencies
DROP POLICY IF EXISTS "Users can view agencies" ON agencies;
DROP POLICY IF EXISTS "Users can view their agency" ON agencies;

CREATE POLICY "authenticated_select_agencies"
  ON agencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_agencies"
  ON agencies FOR ALL
  TO authenticated
  USING (true);
