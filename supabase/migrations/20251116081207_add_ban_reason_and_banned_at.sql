/*
  # Add ban reason and timestamp to users

  1. Changes
    - Add `ban_reason` column to store the reason for banning
    - Add `banned_at` column to track when user was banned
    - Add `banned_by` column to track which admin banned the user

  2. Notes
    - Existing users will have NULL values for these fields
    - Only populated when a user is banned
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN ban_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE users ADD COLUMN banned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banned_by'
  ) THEN
    ALTER TABLE users ADD COLUMN banned_by uuid REFERENCES users(id);
  END IF;
END $$;