/*
  # Create Property QR Codes System

  1. New Tables
    - `property_qr_codes`
      - `id` (uuid, primary key)
      - `property_id` (uuid, references properties)
      - `qr_code` (text, unique) - Code unique pour l'URL
      - `agency_id` (uuid, references agencies)
      - `is_active` (boolean) - Active or deactivated
      - `scan_count` (integer) - Number of times scanned
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `property_qr_codes`
    - Agency users can read/write their own property QR codes
    - Public can read active QR codes

  3. Functions
    - `generate_property_qr_code()` - Generate unique QR code for property
*/

-- Create property_qr_codes table
CREATE TABLE IF NOT EXISTS property_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  qr_code text UNIQUE NOT NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  scan_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_property_qr_codes_property_id ON property_qr_codes(property_id);
CREATE INDEX IF NOT EXISTS idx_property_qr_codes_qr_code ON property_qr_codes(qr_code);
CREATE INDEX IF NOT EXISTS idx_property_qr_codes_agency_id ON property_qr_codes(agency_id);

-- Enable RLS
ALTER TABLE property_qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_qr_codes
CREATE POLICY "Agency users can view their property QR codes"
  ON property_qr_codes FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Agency users can create property QR codes"
  ON property_qr_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Agency users can update their property QR codes"
  ON property_qr_codes FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Agency users can delete their property QR codes"
  ON property_qr_codes FOR DELETE
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
  );

-- Function to generate unique property QR code
CREATE OR REPLACE FUNCTION generate_property_qr_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM property_qr_codes WHERE qr_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;
