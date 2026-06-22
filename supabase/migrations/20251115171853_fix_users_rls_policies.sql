/*
  # Fix Users RLS Policies - Remove Infinite Recursion

  This migration fixes the infinite recursion issue in users table policies.

  ## Changes
  
  1. **Drop existing problematic policies**
     - Remove all policies that query the users table within their conditions
  
  2. **Create new simplified policies**
     - Users can view their own profile directly via auth.uid()
     - Admins can manage users via a simpler check that doesn't cause recursion

  ## Important Notes
  - Uses auth.uid() directly instead of querying users table
  - Removes circular dependency in policy definitions
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view users in their agency" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their agency" ON users;
DROP POLICY IF EXISTS "Admins can update users in their agency" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their agency" ON users;

-- Create new policies that don't cause recursion

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can view other users in the same agency (using a function to avoid recursion)
CREATE OR REPLACE FUNCTION get_user_agency_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT agency_id FROM users WHERE id = user_id LIMIT 1;
$$;

CREATE POLICY "Users can view users in same agency"
  ON users FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()));

-- Admins can insert users in their agency
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admins can update users in their agency
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  )
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admins can delete users in their agency
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );
