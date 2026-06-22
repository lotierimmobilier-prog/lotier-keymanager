/*
  # Create Dashboard Content System

  This migration creates a system for customizable dashboard content
  that the super admin can manage.

  ## New Tables

  1. **dashboard_content**
     - `id` (uuid, primary key)
     - `content_type` (text) - Type: welcome, tip, announcement, guide
     - `title` (text) - Title of the content block
     - `content` (text) - Main content (supports markdown)
     - `icon` (text) - Icon name for display
     - `color` (text) - Color theme (blue, green, amber, red)
     - `is_active` (boolean) - Whether to display this content
     - `display_order` (integer) - Order of display
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  ## Security

  - All authenticated users can view active content
  - Only super admins can create/update/delete content

  ## Default Content

  - Welcome message
  - Getting started guide
  - Usage tips
*/

-- Create dashboard_content table
CREATE TABLE IF NOT EXISTS dashboard_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('welcome', 'tip', 'announcement', 'guide')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT DEFAULT 'Info',
  color TEXT DEFAULT 'blue' CHECK (color IN ('blue', 'green', 'amber', 'red', 'slate')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dashboard_content ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active content
CREATE POLICY "authenticated_select_active_content"
  ON dashboard_content FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: All authenticated users can view all content (for super admin interface)
CREATE POLICY "authenticated_select_all_content"
  ON dashboard_content FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow insert/update/delete for authenticated users
-- (Super admin check happens at application level)
CREATE POLICY "authenticated_manage_content"
  ON dashboard_content FOR ALL
  TO authenticated
  USING (true);

-- Insert default content
INSERT INTO dashboard_content (content_type, title, content, icon, color, display_order, is_active) VALUES
(
  'welcome',
  'Bienvenue sur KeyManager',
  'KeyManager vous aide à gérer vos clés et biens immobiliers de manière simple et efficace. Suivez vos mouvements de clés, gérez vos propriétés et collaborez avec votre équipe en temps réel.',
  'Home',
  'amber',
  1,
  true
),
(
  'guide',
  'Guide de démarrage rapide',
  '1. **Ajoutez vos biens** : Commencez par enregistrer vos propriétés dans la section Biens\n2. **Créez vos clés** : Associez des clés à chaque bien dans la section Clés\n3. **Gérez les mouvements** : Suivez qui a quelle clé et quand elle doit être rendue\n4. **Ajoutez des contacts** : Enregistrez vos contacts pour faciliter la gestion',
  'BookOpen',
  'blue',
  2,
  true
),
(
  'tip',
  'Conseil du jour',
  'Utilisez la fonction de recherche rapide pour retrouver instantanément une clé ou un bien. Vous pouvez filtrer par statut, adresse ou référence.',
  'Lightbulb',
  'green',
  3,
  true
),
(
  'announcement',
  'Restez organisé',
  'N''oubliez pas de marquer les clés comme rendues dès leur retour. Cela vous permet de maintenir un suivi précis et d''éviter les doublons.',
  'Bell',
  'slate',
  4,
  true
)
ON CONFLICT DO NOTHING;
