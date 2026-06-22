/*
  # Create QR Codes System

  1. New Tables
    - `key_qr_codes`
      - `id` (uuid, primary key)
      - `key_id` (uuid, references keys)
      - `qr_code` (text, unique) - Code unique pour l'URL
      - `qr_image_url` (text) - URL de l'image QR générée
      - `is_active` (boolean) - Pour désactiver si perdu
      - `scan_count` (integer) - Nombre de scans
      - `last_scanned_at` (timestamptz)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references users)
      - `agency_id` (uuid, references agencies)
    
    - `qr_scan_logs`
      - `id` (uuid, primary key)
      - `qr_code_id` (uuid, references key_qr_codes)
      - `key_id` (uuid, references keys)
      - `action` (text) - 'take' ou 'drop'
      - `user_name` (text) - Nom déclaré
      - `user_phone` (text) - Téléphone déclaré
      - `user_email` (text) - Email déclaré
      - `location_lat` (numeric)
      - `location_lng` (numeric)
      - `photo_url` (text) - Photo de preuve
      - `notes` (text)
      - `ip_address` (text)
      - `user_agent` (text)
      - `created_at` (timestamptz)
      - `agency_id` (uuid, references agencies)

  2. Security
    - Enable RLS on both tables
    - key_qr_codes: Agency users can read/write their own QR codes
    - qr_scan_logs: Public can insert, agency users can read their logs
*/

-- Create key_qr_codes table
CREATE TABLE IF NOT EXISTS key_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES keys(id) ON DELETE CASCADE,
  qr_code text UNIQUE NOT NULL,
  qr_image_url text,
  is_active boolean DEFAULT true,
  scan_count integer DEFAULT 0,
  last_scanned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE
);

-- Create qr_scan_logs table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL REFERENCES key_qr_codes(id) ON DELETE CASCADE,
  key_id uuid NOT NULL REFERENCES keys(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('take', 'drop')),
  user_name text NOT NULL,
  user_phone text,
  user_email text,
  location_lat numeric,
  location_lng numeric,
  photo_url text,
  notes text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_key_qr_codes_key_id ON key_qr_codes(key_id);
CREATE INDEX IF NOT EXISTS idx_key_qr_codes_qr_code ON key_qr_codes(qr_code);
CREATE INDEX IF NOT EXISTS idx_key_qr_codes_agency_id ON key_qr_codes(agency_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr_code_id ON qr_scan_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_key_id ON qr_scan_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_agency_id ON qr_scan_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_created_at ON qr_scan_logs(created_at DESC);

-- Enable RLS
ALTER TABLE key_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for key_qr_codes

-- Agency users can read their own QR codes
CREATE POLICY "Users can view QR codes from their agency"
  ON key_qr_codes FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Agency users can create QR codes
CREATE POLICY "Users can create QR codes for their agency"
  ON key_qr_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Agency users can update their QR codes
CREATE POLICY "Users can update QR codes from their agency"
  ON key_qr_codes FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Agency users can delete their QR codes
CREATE POLICY "Users can delete QR codes from their agency"
  ON key_qr_codes FOR DELETE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies for qr_scan_logs

-- Public can insert scan logs (no auth required for scanning)
CREATE POLICY "Anyone can create scan logs"
  ON qr_scan_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Agency users can read their scan logs
CREATE POLICY "Users can view scan logs from their agency"
  ON qr_scan_logs FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Function to generate unique QR code
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate random 8-character alphanumeric code
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM key_qr_codes WHERE qr_code = new_code) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;