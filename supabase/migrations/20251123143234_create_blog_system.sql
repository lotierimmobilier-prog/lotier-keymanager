/*
  # Create Blog System for KeyManager

  1. New Tables
    - `blog_articles`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-friendly identifier
      - `title_h1` (text) - Main title (H1)
      - `meta_title` (text) - SEO meta title
      - `meta_description` (text) - SEO meta description (140-160 chars)
      - `keywords_primary` (text) - Main keyword
      - `keywords_secondary` (text[]) - Array of secondary keywords
      - `h2_introduction` (text) - Introduction section title
      - `content_introduction` (text) - Introduction content
      - `h2_problematic` (text) - Problem section title
      - `content_problematic` (text) - Problem content
      - `h3_problematic_details` (text, nullable) - Optional problem details title
      - `content_problematic_details` (text, nullable) - Optional problem details content
      - `h2_solutions` (text) - Solutions section title
      - `content_solutions` (text) - Solutions content
      - `h3_solutions_details` (text, nullable) - Optional solutions details title
      - `content_solutions_details` (text, nullable) - Optional solutions details content
      - `h2_digital` (text) - Digital benefits section title
      - `content_digital` (text) - Digital benefits content
      - `h3_digital_details` (text, nullable) - Optional digital details title
      - `content_digital_details` (text, nullable) - Optional digital details content
      - `h2_results` (text) - Results section title
      - `content_results` (text) - Results content
      - `h3_results_details` (text, nullable) - Optional results details title
      - `content_results_details` (text, nullable) - Optional results details content
      - `h2_conclusion` (text) - Conclusion section title
      - `content_conclusion` (text) - Conclusion content
      - `cta_text` (text) - Call-to-action text
      - `cta_link` (text) - Call-to-action link
      - `featured_image_url` (text, nullable) - Article image
      - `is_published` (boolean) - Publication status
      - `published_at` (timestamptz, nullable) - Publication date
      - `author_id` (uuid) - Reference to super admin author
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `blog_articles` table
    - Public can read published articles
    - Only super admins can create/update/delete articles
*/

CREATE TABLE IF NOT EXISTS blog_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_h1 text NOT NULL,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  keywords_primary text NOT NULL,
  keywords_secondary text[] DEFAULT '{}',
  h2_introduction text NOT NULL DEFAULT 'Introduction',
  content_introduction text NOT NULL,
  h2_problematic text NOT NULL DEFAULT 'La problématique',
  content_problematic text NOT NULL,
  h3_problematic_details text,
  content_problematic_details text,
  h2_solutions text NOT NULL DEFAULT 'Les solutions',
  content_solutions text NOT NULL,
  h3_solutions_details text,
  content_solutions_details text,
  h2_digital text NOT NULL DEFAULT 'L''apport du digital',
  content_digital text NOT NULL,
  h3_digital_details text,
  content_digital_details text,
  h2_results text NOT NULL DEFAULT 'Résultats et bénéfices',
  content_results text NOT NULL,
  h3_results_details text,
  content_results_details text,
  h2_conclusion text NOT NULL DEFAULT 'Conclusion',
  content_conclusion text NOT NULL,
  cta_text text NOT NULL DEFAULT 'Essayer gratuitement KeyManager',
  cta_link text NOT NULL DEFAULT '/signup',
  featured_image_url text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles"
  ON blog_articles FOR SELECT
  USING (is_published = true);

CREATE POLICY "Super admins can view all articles"
  ON blog_articles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can insert articles"
  ON blog_articles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update articles"
  ON blog_articles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete articles"
  ON blog_articles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_blog_articles_published ON blog_articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_articles_author ON blog_articles(author_id);

CREATE OR REPLACE FUNCTION update_blog_article_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_articles_updated_at
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_article_updated_at();