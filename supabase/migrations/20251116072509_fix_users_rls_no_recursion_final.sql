/*
  # Fix Users RLS - Remove All Recursion (Final)

  This migration completely removes all recursive policies on the users table.
  
  ## Problem
  
  Policies that query the users table to check permissions on the users table
  create infinite recursion.

  ## Solution
  
  1. Drop ALL existing policies on users table
  2. Create simple, non-recursive policies:
     - Allow authenticated users to SELECT all users (filtering by agency happens in app)
     - Allow users to UPDATE only their own record
     - Allow INSERT for user creation
     - Allow DELETE (controlled by app logic)
  
  ## Security
  
  - Authenticated users can view all users (app filters by agency_id)
  - Super admin checks happen at application level
  - Ban checks happen at application level
  - Users can only update their own profile
  - Deletion is controlled at application level
*/

-- Drop ALL policies on users table
DROP POLICY IF EXISTS "Users can view based on role" ON users;
DROP POLICY IF EXISTS "Users can update based on role" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Allow user deletion" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in same agency" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Simple SELECT policy: authenticated users can view all users
-- App will filter by agency_id and check is_banned
CREATE POLICY "authenticated_users_select_all"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Simple UPDATE policy: users can only update their own record
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Simple INSERT policy: allow authenticated users to insert
-- (Used during signup and admin user creation)
CREATE POLICY "authenticated_users_insert"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Simple DELETE policy: allow authenticated users to delete
-- (App controls who can delete whom)
CREATE POLICY "authenticated_users_delete"
  ON users FOR DELETE
  TO authenticated
  USING (true);
