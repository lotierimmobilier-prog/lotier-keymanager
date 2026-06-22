/*
  # Add Owner Information and Reference Logic System

  This migration adds owner information to properties and creates a configurable reference pattern system.

  ## Changes to Properties Table

  1. **Add owner fields**
     - `owner_name` (text) - Owner name or SCI name
     - `owner_first_name` (text) - Owner first name (optional for SCI)

  ## New Tables

  ### agency_settings
  Stores agency-specific configuration including reference patterns
  - `id` (uuid, PK) - Unique identifier
  - `agency_id` (uuid, FK to agencies, unique) - One settings record per agency
  - `property_reference_pattern` (text) - Pattern for property references
  - `key_reference_pattern` (text) - Pattern for key references
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Reference Pattern Variables

  Property patterns:
  - {owner_name:3} - First 3 letters of owner name
  - {owner_first_name:3} - First 3 letters of owner first name
  - {address:3} - First 3 letters of address
  - {type:3} - First 3 letters of property type
  - {counter:3} - Auto-incrementing counter

  Key patterns:
  - {property_ref} - Full property reference
  - {label:3} - First 3 letters of key label
  - {counter:3} - Auto-incrementing counter

  ## Default Patterns
  - Property: {owner_name:3}-{address:3}-{counter:3}
  - Key: {property_ref}-{counter:2}

  ## Security
  - RLS enabled on agency_settings
  - Only admins can modify settings
  - Users can view their agency settings

  ## Important Notes
  - Patterns are stored as templates and processed when creating references
  - Counters are tracked per agency for uniqueness
  - All references are converted to uppercase
*/

-- Add owner fields to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE properties ADD COLUMN owner_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'owner_first_name'
  ) THEN
    ALTER TABLE properties ADD COLUMN owner_first_name text DEFAULT '';
  END IF;
END $$;

-- Create agency_settings table
CREATE TABLE IF NOT EXISTS agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  property_reference_pattern text NOT NULL DEFAULT '{owner_name:3}-{address:3}-{counter:3}',
  key_reference_pattern text NOT NULL DEFAULT '{property_ref}-{counter:2}',
  property_counter integer NOT NULL DEFAULT 0,
  key_counter integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agency_settings

-- Users can view their agency settings
CREATE POLICY "Users can view their agency settings"
  ON agency_settings FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()));

-- Admins can insert settings for their agency
CREATE POLICY "Admins can insert agency settings"
  ON agency_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Admins can update their agency settings
CREATE POLICY "Admins can update agency settings"
  ON agency_settings FOR UPDATE
  TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  )
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agency_settings_agency_id ON agency_settings(agency_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agency_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS agency_settings_updated_at_trigger ON agency_settings;
CREATE TRIGGER agency_settings_updated_at_trigger
  BEFORE UPDATE ON agency_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_settings_updated_at();

-- Function to generate property reference
CREATE OR REPLACE FUNCTION generate_property_reference(
  p_agency_id uuid,
  p_owner_name text,
  p_owner_first_name text,
  p_address text,
  p_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pattern text;
  v_counter integer;
  v_reference text;
BEGIN
  -- Get the pattern and increment counter
  SELECT property_reference_pattern, property_counter + 1
  INTO v_pattern, v_counter
  FROM agency_settings
  WHERE agency_id = p_agency_id;

  -- If no settings exist, create default
  IF v_pattern IS NULL THEN
    INSERT INTO agency_settings (agency_id)
    VALUES (p_agency_id)
    ON CONFLICT (agency_id) DO NOTHING;
    
    v_pattern := '{owner_name:3}-{address:3}-{counter:3}';
    v_counter := 1;
  END IF;

  -- Update counter
  UPDATE agency_settings
  SET property_counter = v_counter
  WHERE agency_id = p_agency_id;

  -- Build reference from pattern
  v_reference := v_pattern;
  
  -- Replace variables
  v_reference := regexp_replace(v_reference, '\{owner_name:(\d+)\}', 
    substring(upper(regexp_replace(p_owner_name, '[^a-zA-Z]', '', 'g')), 1, '\1'), 'g');
  v_reference := regexp_replace(v_reference, '\{owner_first_name:(\d+)\}', 
    substring(upper(regexp_replace(coalesce(p_owner_first_name, ''), '[^a-zA-Z]', '', 'g')), 1, '\1'), 'g');
  v_reference := regexp_replace(v_reference, '\{address:(\d+)\}', 
    substring(upper(regexp_replace(p_address, '[^a-zA-Z]', '', 'g')), 1, '\1'), 'g');
  v_reference := regexp_replace(v_reference, '\{type:(\d+)\}', 
    substring(upper(regexp_replace(p_type, '[^a-zA-Z]', '', 'g')), 1, '\1'), 'g');
  v_reference := replace(v_reference, '{counter:3}', lpad(v_counter::text, 3, '0'));
  v_reference := replace(v_reference, '{counter:2}', lpad(v_counter::text, 2, '0'));
  v_reference := replace(v_reference, '{counter:4}', lpad(v_counter::text, 4, '0'));

  RETURN v_reference;
END;
$$;

-- Function to generate key reference
CREATE OR REPLACE FUNCTION generate_key_reference(
  p_agency_id uuid,
  p_property_ref text,
  p_label text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pattern text;
  v_counter integer;
  v_reference text;
BEGIN
  -- Get the pattern and increment counter
  SELECT key_reference_pattern, key_counter + 1
  INTO v_pattern, v_counter
  FROM agency_settings
  WHERE agency_id = p_agency_id;

  -- If no settings exist, use default
  IF v_pattern IS NULL THEN
    INSERT INTO agency_settings (agency_id)
    VALUES (p_agency_id)
    ON CONFLICT (agency_id) DO NOTHING;
    
    v_pattern := '{property_ref}-{counter:2}';
    v_counter := 1;
  END IF;

  -- Update counter
  UPDATE agency_settings
  SET key_counter = v_counter
  WHERE agency_id = p_agency_id;

  -- Build reference from pattern
  v_reference := v_pattern;
  
  -- Replace variables
  v_reference := replace(v_reference, '{property_ref}', upper(p_property_ref));
  v_reference := regexp_replace(v_reference, '\{label:(\d+)\}', 
    substring(upper(regexp_replace(p_label, '[^a-zA-Z]', '', 'g')), 1, '\1'), 'g');
  v_reference := replace(v_reference, '{counter:2}', lpad(v_counter::text, 2, '0'));
  v_reference := replace(v_reference, '{counter:3}', lpad(v_counter::text, 3, '0'));
  v_reference := replace(v_reference, '{counter:4}', lpad(v_counter::text, 4, '0'));

  RETURN v_reference;
END;
$$;
