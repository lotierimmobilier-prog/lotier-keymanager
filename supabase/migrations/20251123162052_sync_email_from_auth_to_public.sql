/*
  # Synchronize email from auth.users to public.users

  1. Changes
    - Create a trigger to automatically sync email from auth.users to public.users
    - Update existing emails to match auth.users
    - Ensure email is always up-to-date when auth email changes

  2. Security
    - Only syncs when auth email changes
    - Maintains data consistency between auth and public tables
*/

-- Function to sync email from auth.users to public.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update public.users email when auth.users email changes
  UPDATE public.users
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplicates
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;

-- Create trigger on auth.users to sync email changes
CREATE TRIGGER sync_user_email_trigger
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Sync existing emails from auth.users to public.users
UPDATE public.users u
SET email = au.email
FROM auth.users au
WHERE u.id = au.id
AND u.email != au.email;