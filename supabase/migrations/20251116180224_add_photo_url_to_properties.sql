/*
  # Add Photo URL to Properties Table

  1. Changes
    - Add `photo_url` column to properties table (for storing key photos)

  2. Notes
    - Photo is optional when creating a property
    - This field will store the URL to the uploaded key photo
    - No RLS changes needed as field follows existing property access rules
*/

-- Add photo_url column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS photo_url text;
