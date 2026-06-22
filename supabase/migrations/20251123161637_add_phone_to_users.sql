/*
  # Add phone column to users table

  1. Changes
    - Add `phone` column to the `users` table
    - Column is nullable to allow existing users without phone numbers
    - Column type is text to support international phone formats

  2. Notes
    - This allows users to store their phone number in their profile
    - Phone number can be used for SMS notifications and contact purposes
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
END $$;