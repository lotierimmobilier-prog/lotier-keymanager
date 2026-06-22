/*
  # Add mandate number to properties

  1. Changes
    - Add `mandate_number` column to properties table (optional text field)
    
  2. Notes
    - This field is optional and can be used to track mandate numbers for properties
    - No RLS changes needed as the field follows existing property access rules
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'mandate_number'
  ) THEN
    ALTER TABLE properties ADD COLUMN mandate_number text;
  END IF;
END $$;
