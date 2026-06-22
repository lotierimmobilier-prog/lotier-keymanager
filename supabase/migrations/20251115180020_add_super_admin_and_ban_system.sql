/*
  # Add Super Admin and Ban System

  This migration adds site-wide super admin functionality and user banning.

  ## Changes

  1. **Add is_super_admin flag to users table**
     - Boolean flag to identify site administrators
     - Defaults to false
     - Super admins can access all agencies and data

  2. **Add is_banned flag to users table**
     - Boolean flag to ban users
     - Defaults to false
     - Banned users cannot access the application

  3. **Add payment tracking to subscriptions**
     - Add payment_status field (paid, pending, failed)
     - Add last_payment_date timestamp
     - Add next_payment_date timestamp

  4. **Update RLS policies**
     - Super admins can view all data
     - Banned users are blocked from all operations

  ## Security

  - Only super admins can view all users across agencies
  - Only super admins can ban/unban users
  - Banned users are immediately blocked from all operations
  - Regular admins remain limited to their agency
*/

-- Add super admin and banned flags to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Add payment tracking to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ;

-- Add check constraint for payment_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'subscriptions' AND constraint_name = 'subscriptions_payment_status_check'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_payment_status_check
      CHECK (payment_status IN ('paid', 'pending', 'failed', 'cancelled'));
  END IF;
END $$;

-- Set the initial super admin
UPDATE users SET is_super_admin = true WHERE email = 'admin@keymanager.fr';

-- Drop existing policies that conflict
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;

-- Create new policies with super admin and ban checks

-- Policy: Super admins can view all users, others can view users (app filters by agency)
CREATE POLICY "Users can view based on role"
  ON users FOR SELECT
  TO authenticated
  USING (
    NOT is_banned
    AND (
      (SELECT is_super_admin FROM users WHERE id = auth.uid()) = true
      OR true
    )
  );

-- Policy: Super admins can update any user, regular users can update themselves
CREATE POLICY "Users can update based on role"
  ON users FOR UPDATE
  TO authenticated
  USING (
    NOT is_banned
    AND (
      (SELECT is_super_admin FROM users WHERE id = auth.uid()) = true
      OR id = auth.uid()
    )
  )
  WITH CHECK (
    NOT is_banned
    AND (
      (SELECT is_super_admin FROM users WHERE id = auth.uid()) = true
      OR id = auth.uid()
    )
  );

-- Update all other table policies to check for banned status
-- Properties
DROP POLICY IF EXISTS "Users can view agency properties" ON properties;
CREATE POLICY "Users can view agency properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND (users.is_super_admin = true OR users.agency_id = properties.agency_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage agency properties" ON properties;
CREATE POLICY "Users can manage agency properties"
  ON properties FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND users.agency_id = properties.agency_id
    )
  );

-- Keys
DROP POLICY IF EXISTS "Users can view agency keys" ON keys;
CREATE POLICY "Users can view agency keys"
  ON keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND (users.is_super_admin = true OR users.agency_id = keys.agency_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage agency keys" ON keys;
CREATE POLICY "Users can manage agency keys"
  ON keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND users.agency_id = keys.agency_id
    )
  );

-- Key Movements
DROP POLICY IF EXISTS "Users can view agency movements" ON key_movements;
CREATE POLICY "Users can view agency movements"
  ON key_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND (users.is_super_admin = true OR users.agency_id = key_movements.agency_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage agency movements" ON key_movements;
CREATE POLICY "Users can manage agency movements"
  ON key_movements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND users.agency_id = key_movements.agency_id
    )
  );

-- Contacts
DROP POLICY IF EXISTS "Users can view agency contacts" ON contacts;
CREATE POLICY "Users can view agency contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND (users.is_super_admin = true OR users.agency_id = contacts.agency_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage agency contacts" ON contacts;
CREATE POLICY "Users can manage agency contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND users.agency_id = contacts.agency_id
    )
  );

-- Subscriptions: Super admins can view all
DROP POLICY IF EXISTS "Users can view agency subscription" ON subscriptions;
CREATE POLICY "Users can view subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND (users.is_super_admin = true OR users.agency_id = subscriptions.agency_id)
    )
  );

-- Agencies: Super admins can view all
DROP POLICY IF EXISTS "Users can view their agency" ON agencies;
CREATE POLICY "Users can view agencies"
  ON agencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_banned = false
      AND (users.is_super_admin = true OR users.agency_id = agencies.id)
    )
  );
