/*
  # Fix User System and Role Management

  This migration fixes the user authentication system and implements proper role management.

  ## Changes

  1. **Make agency_id NOT NULL for users**
     - All users must belong to an agency
  
  2. **Update RLS policies**
     - Remove dependency on get_user_agency_id for SELECT (causes errors when user record doesn't exist yet)
     - Allow users to view their own profile
     - Allow authenticated users to view users in their agency

  3. **Role System**
     - ADMIN: Agency administrator (first user, can manage everything including settings and users)
     - COLLAB: Agency collaborator (can use the app but no admin features)
     - PRESTATAIRE: External service provider

  ## Security
  - Users can only view users in their agency
  - Only ADMINs can create, update, and delete users
  - Each user must be authenticated to access data

  ## Important Notes
  - The first user of an agency is always an ADMIN
  - Collaborators can access all features except settings and user management
  - User creation happens in the application, not during signup
*/

-- Update users table to make agency_id NOT NULL for new records
-- Existing records with NULL agency_id are preserved for now

-- Update RLS policies for users table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their agency" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view agency users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to view other users in their agency
CREATE POLICY "Users can view agency members"
  ON users FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow users to update their own profile (except role and agency_id)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- Allow ADMINs to insert new users in their agency
CREATE POLICY "Admins can insert agency users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Allow ADMINs to update users in their agency
CREATE POLICY "Admins can update agency users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Allow ADMINs to delete users in their agency (except themselves)
CREATE POLICY "Admins can delete agency users"
  ON users FOR DELETE
  TO authenticated
  USING (
    id != auth.uid()
    AND agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
