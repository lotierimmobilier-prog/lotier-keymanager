/*
  # Add User Tracking to Properties and Key Movements

  1. Changes to `properties` table
    - Add `created_by` column (uuid, foreign key to users)
    - Identifies which collaborator created the property entry

  2. Changes to `key_movements` table
    - Add `recorded_by` column (uuid, foreign key to users)
    - Identifies which collaborator recorded the key movement (entry or exit)

  3. Notes
    - Both fields are nullable to maintain compatibility with existing data
    - No RLS changes needed as fields follow existing access rules
    - These fields will be automatically populated going forward
*/

-- Add created_by to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- Add recorded_by to key_movements table
ALTER TABLE key_movements
ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);
CREATE INDEX IF NOT EXISTS idx_key_movements_recorded_by ON key_movements(recorded_by);
