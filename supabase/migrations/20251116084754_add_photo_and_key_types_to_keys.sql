/*
  # Add Photo and Key Types to Keys Table

  1. Changes
    - Add `photo_url` column to keys table (required field for key photos)
    - Add `key_entrance` boolean column (for entrance keys)
    - Add `key_mailbox` boolean column (for mailbox keys)
    - Add `key_badge` boolean column (for badges)
    - Add `key_parking` boolean column (for parking remotes)
    - Add `key_bike` boolean column (for bike room keys)
    - Add `key_other` text column (for other key types - free text)
    
  2. Notes
    - Photo is required when creating a key
    - At least one key type should be checked
    - All boolean fields default to false
    - No RLS changes needed as fields follow existing key access rules
*/

DO $$
BEGIN
  -- Add photo_url column (required)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE keys ADD COLUMN photo_url text;
  END IF;

  -- Add key type boolean columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'key_entrance'
  ) THEN
    ALTER TABLE keys ADD COLUMN key_entrance boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'key_mailbox'
  ) THEN
    ALTER TABLE keys ADD COLUMN key_mailbox boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'key_badge'
  ) THEN
    ALTER TABLE keys ADD COLUMN key_badge boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'key_parking'
  ) THEN
    ALTER TABLE keys ADD COLUMN key_parking boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'key_bike'
  ) THEN
    ALTER TABLE keys ADD COLUMN key_bike boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'keys' AND column_name = 'key_other'
  ) THEN
    ALTER TABLE keys ADD COLUMN key_other text;
  END IF;
END $$;
