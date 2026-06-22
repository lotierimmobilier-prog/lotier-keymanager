/*
  # Add Movement Modification and Deletion Tracking

  1. Changes
    - Add columns to track modifications and deletions with mandatory reason
    - `deleted_at` - timestamp when movement was deleted
    - `deleted_by` - user who deleted the movement
    - `deletion_reason` - mandatory reason for deletion
    - `modified_at` - timestamp of last modification
    - `modified_by` - user who last modified the movement
    - `modification_reason` - mandatory reason for modification
    
  2. Security
    - All columns are nullable to maintain compatibility
    - Foreign keys reference users table
*/

DO $$
BEGIN
  -- Add deletion tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN deleted_by uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'deletion_reason'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN deletion_reason text;
  END IF;

  -- Add modification tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'modified_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN modified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'modified_by'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN modified_by uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'modification_reason'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN modification_reason text;
  END IF;
END $$;