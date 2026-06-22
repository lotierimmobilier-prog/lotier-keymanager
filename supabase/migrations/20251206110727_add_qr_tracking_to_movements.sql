/*
  # Add QR Code Tracking to Key Movements

  1. Changes
    - Add `created_via_qr` column to track movements created via QR code scan
    - Add `qr_code_id` column to link to the QR code used
  
  2. Notes
    - These fields are optional and only populated for QR-based movements
*/

-- Add QR tracking fields to key_movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'created_via_qr'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN created_via_qr boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'key_movements' AND column_name = 'qr_code_id'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN qr_code_id uuid REFERENCES key_qr_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for QR code movements
CREATE INDEX IF NOT EXISTS idx_key_movements_qr_code_id ON key_movements(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_key_movements_created_via_qr ON key_movements(created_via_qr) WHERE created_via_qr = true;
