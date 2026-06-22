/*
  # Allow super admins to update any user profile

  1. Changes
    - Add RLS policy to allow super admins to update any user in the users table
    - This enables impersonation functionality where super admins can modify profiles

  2. Security
    - Only users with is_super_admin = true can update other users
    - Regular users can still only update their own profile via existing policy
*/

-- Allow super admins to update any user profile
CREATE POLICY "super_admins_update_any_user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );
