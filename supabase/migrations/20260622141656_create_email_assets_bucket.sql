
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read email-assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'email-assets');

CREATE POLICY "Auth upload email-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'email-assets');

CREATE POLICY "Auth upsert email-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'email-assets');
