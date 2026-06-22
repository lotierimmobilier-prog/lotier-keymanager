/*
  # Create storage bucket for blog images

  1. Storage Setup
    - Create public-assets bucket if not exists
    - Set public access for uploaded images
    - Add policies for authenticated users to upload

  2. Security
    - Only authenticated users can upload
    - Everyone can read public images
    - File size limits enforced
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view public assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public assets are publicly accessible'
  ) THEN
    CREATE POLICY "Public assets are publicly accessible"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'public-assets');
  END IF;
END $$;

-- Policy: Authenticated users can upload to public-assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload public assets'
  ) THEN
    CREATE POLICY "Authenticated users can upload public assets"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'public-assets');
  END IF;
END $$;

-- Policy: Users can update their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own uploads'
  ) THEN
    CREATE POLICY "Users can update their own uploads"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'public-assets' AND auth.uid()::text = owner::text)
      WITH CHECK (bucket_id = 'public-assets');
  END IF;
END $$;

-- Policy: Users can delete their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own uploads'
  ) THEN
    CREATE POLICY "Users can delete their own uploads"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'public-assets' AND auth.uid()::text = owner::text);
  END IF;
END $$;
