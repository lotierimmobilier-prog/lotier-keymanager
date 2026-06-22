/*
  # Add Building Key Type

  1. Changes
    - Add `key_building` boolean column to keys table for building keys
    
  2. Notes
    - Default value is false
    - No RLS changes needed as field follows existing key access rules
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'key_building'
  ) THEN
    ALTER TABLE keys ADD COLUMN key_building boolean DEFAULT false;
  END IF;
END $$;
