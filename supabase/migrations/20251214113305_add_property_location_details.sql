/*
  # Add Property Location Details

  1. Changes
    - Add `postal_code` (text) to properties table
    - Add `city` (text) to properties table
    - Add `building` (text) to properties table
    - Add `floor` (text) to properties table
    - Add `door` (text) to properties table
    
  2. Notes
    - All fields are optional to maintain compatibility with existing data
    - These fields provide more detailed location information for properties
*/

-- Add location detail columns to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE properties ADD COLUMN postal_code text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'city'
  ) THEN
    ALTER TABLE properties ADD COLUMN city text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'building'
  ) THEN
    ALTER TABLE properties ADD COLUMN building text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'floor'
  ) THEN
    ALTER TABLE properties ADD COLUMN floor text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'door'
  ) THEN
    ALTER TABLE properties ADD COLUMN door text DEFAULT '';
  END IF;
END $$;
