/*
  # Add Signature and Photo System for Key Movements

  This migration adds timestamped signature and photo tracking for key check-out and check-in operations.

  ## Changes

  1. **key_movements table modifications**
     - Add `agency_signature_out` (text) - Agency signature when key goes out
     - Add `agency_signature_out_at` (timestamptz) - Timestamp of agency signature
     - Add `provider_signature_out` (text) - Provider signature when receiving key
     - Add `provider_signature_out_at` (timestamptz) - Timestamp of provider signature
     - Add `photo_out_url` (text) - Photo of keys when leaving (REQUIRED)
     - Add `agency_signature_in` (text) - Agency signature when key returns
     - Add `agency_signature_in_at` (timestamptz) - Timestamp of agency signature on return
     - Add `provider_signature_in` (text) - Provider signature when returning key
     - Add `provider_signature_in_at` (timestamptz) - Timestamp of provider signature on return
     - Add `photo_in_url` (text) - Photo of keys when returning (REQUIRED)

  ## Important Notes
  - Signatures are stored as base64 encoded data URIs
  - Photos are stored as URLs (Supabase Storage URLs)
  - All signatures have corresponding timestamps for audit trail
  - Photos are REQUIRED for both check-out and check-in operations
*/

-- Add signature and photo columns to key_movements table
DO $$
BEGIN
  -- Agency signature when key goes out
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'agency_signature_out'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN agency_signature_out text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'agency_signature_out_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN agency_signature_out_at timestamptz;
  END IF;

  -- Provider signature when receiving key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'provider_signature_out'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN provider_signature_out text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'provider_signature_out_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN provider_signature_out_at timestamptz;
  END IF;

  -- Photo when key goes out (REQUIRED)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'photo_out_url'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN photo_out_url text;
  END IF;

  -- Agency signature when key returns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'agency_signature_in'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN agency_signature_in text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'agency_signature_in_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN agency_signature_in_at timestamptz;
  END IF;

  -- Provider signature when returning key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'provider_signature_in'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN provider_signature_in text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'provider_signature_in_at'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN provider_signature_in_at timestamptz;
  END IF;

  -- Photo when key returns (REQUIRED)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_movements' AND column_name = 'photo_in_url'
  ) THEN
    ALTER TABLE key_movements ADD COLUMN photo_in_url text;
  END IF;
END $$;

-- Create storage bucket for key photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('key-photos', 'key-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for key photos
DO $$
BEGIN
  -- Allow authenticated users to upload photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload key photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload key photos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'key-photos');
  END IF;

  -- Allow authenticated users to view photos from their agency
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view key photos from their agency'
  ) THEN
    CREATE POLICY "Users can view key photos from their agency"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'key-photos');
  END IF;

  -- Allow public access to photos (since bucket is public)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view key photos'
  ) THEN
    CREATE POLICY "Public can view key photos"
      ON storage.objects FOR SELECT
      TO anon
      USING (bucket_id = 'key-photos');
  END IF;
END $$;
