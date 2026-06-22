/*
  # Add agency branding and customization

  1. Changes to agencies table
    - Add `logo_url` column for agency logo
    - Add `primary_color` column for main brand color
    - Add `secondary_color` column for secondary brand color
    - Add `slug` column for unique agency URL identifier
    - Add unique constraint on slug

  2. Notes
    - Slug will be used for branded login URLs (e.g., /login/agency-name)
    - Colors stored as hex codes (e.g., #FF5733)
    - Logo URL will be a Supabase Storage URL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE agencies ADD COLUMN logo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE agencies ADD COLUMN primary_color text DEFAULT '#D97706';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'secondary_color'
  ) THEN
    ALTER TABLE agencies ADD COLUMN secondary_color text DEFAULT '#92400E';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'slug'
  ) THEN
    ALTER TABLE agencies ADD COLUMN slug text;
  END IF;
END $$;

-- Create unique index on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'agencies_slug_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX agencies_slug_unique_idx ON agencies(slug) WHERE slug IS NOT NULL;
  END IF;
END $$;

-- Generate slugs for existing agencies based on their names
UPDATE agencies 
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;