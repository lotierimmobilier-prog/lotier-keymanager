/*
  # Add Key Counts to Properties Table

  1. Changes
    - Add columns to `properties` table for tracking key counts by type:
      - `key_entrance_count` (integer) - Number of entrance keys
      - `key_mailbox_count` (integer) - Number of mailbox keys
      - `key_badge_count` (integer) - Number of badge keys
      - `key_parking_count` (integer) - Number of parking keys
      - `key_bike_count` (integer) - Number of bike storage keys
      - `key_building_count` (integer) - Number of building keys
      - `key_other_description` (text) - Description of other key types
      - `key_other_count` (integer) - Number of other keys

  2. Notes
    - All key count columns default to 0
    - This consolidates key management into the properties form
    - The separate keys table will be deprecated in favor of this approach
*/

-- Add key count columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS key_entrance_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_mailbox_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_badge_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_parking_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_bike_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_building_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS key_other_description text DEFAULT '',
ADD COLUMN IF NOT EXISTS key_other_count integer DEFAULT 0;
