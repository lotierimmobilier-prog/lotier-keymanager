/*
  # Site Content Management System

  This migration creates a comprehensive system for managing all website content through the admin panel.

  ## 1. New Tables
    - `site_content_sections`: Stores different sections of the website
      - `id` (uuid, primary key)
      - `page` (text): Page identifier (e.g., 'homepage', 'features', 'pricing')
      - `section_key` (text): Unique key for the section
      - `title` (text): Section title
      - `content` (jsonb): Section content (flexible structure)
      - `display_order` (integer): Order for displaying sections
      - `is_active` (boolean): Whether the section is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ## 2. Security
    - Enable RLS on `site_content_sections` table
    - Add policies for:
      - Public read access for active content
      - Super admin full management access

  ## 3. Indexes
    - Index on page and section_key for fast lookups
    - Index on display_order for sorting

  ## 4. Default Content
    Seeds the table with current site content to make it editable
*/

-- Create site_content_sections table
CREATE TABLE IF NOT EXISTS public.site_content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_key text NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page, section_key)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_site_content_page_key ON public.site_content_sections(page, section_key);
CREATE INDEX IF NOT EXISTS idx_site_content_display_order ON public.site_content_sections(display_order);
CREATE INDEX IF NOT EXISTS idx_site_content_active ON public.site_content_sections(is_active);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_site_content_updated_at ON public.site_content_sections;
CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON public.site_content_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.site_content_sections ENABLE ROW LEVEL SECURITY;

-- Public can view active content
CREATE POLICY "Anyone can view active site content" ON public.site_content_sections
  FOR SELECT
  USING (is_active = true);

-- Super admins can view all content
CREATE POLICY "Super admins can view all site content" ON public.site_content_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Super admins can insert content
CREATE POLICY "Super admins can insert site content" ON public.site_content_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Super admins can update content
CREATE POLICY "Super admins can update site content" ON public.site_content_sections
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Super admins can delete content
CREATE POLICY "Super admins can delete site content" ON public.site_content_sections
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Seed initial content from the site
INSERT INTO public.site_content_sections (page, section_key, title, content, display_order) VALUES
  -- Homepage Hero
  ('homepage', 'hero', 'Section Hero', 
   '{"heading": "Gestion de Clés Simplifiée", "subheading": "La solution complète pour gérer vos clés immobilières en toute sécurité", "ctaText": "Commencer gratuitement", "ctaLink": "/signup"}'::jsonb, 
   1),
  
  -- Homepage Features
  ('homepage', 'features', 'Fonctionnalités Principales', 
   '{"title": "Tout ce dont vous avez besoin", "subtitle": "Une suite complète d''outils pour gérer efficacement vos clés", "features": [{"icon": "key", "title": "Gestion des Clés", "description": "Suivez toutes vos clés en temps réel avec un système de références unique"}, {"icon": "building", "title": "Gestion Immobilière", "description": "Organisez vos propriétés et associez facilement les clés correspondantes"}, {"icon": "users", "title": "Gestion des Contacts", "description": "Centralisez tous vos contacts: propriétaires, locataires, artisans"}, {"icon": "clock", "title": "Historique Complet", "description": "Consultez l''historique détaillé de tous les mouvements de clés"}]}'::jsonb, 
   2),
  
  -- Features Page
  ('features', 'main', 'Nos Fonctionnalités', 
   '{"hero": {"title": "Fonctionnalités Complètes", "subtitle": "Découvrez tous les outils pour simplifier votre gestion quotidienne"}, "features": [{"title": "Gestion des Clés", "description": "Système complet de suivi et gestion de vos clés", "details": ["Création de références uniques", "Statut en temps réel (disponible/sortie)", "Association aux propriétés", "Photos et descriptions"]}, {"title": "Suivi des Mouvements", "description": "Historique détaillé de tous les mouvements", "details": ["Qui a pris quelle clé", "Date et heure de sortie", "Date de retour prévue", "Alertes de retard"]}, {"title": "Gestion Multi-Agences", "description": "Parfait pour les groupes d''agences", "details": ["Isolation des données par agence", "Gestion des utilisateurs et rôles", "Personnalisation par agence", "Statistiques consolidées"]}]}'::jsonb, 
   1),
  
  -- Pricing Page
  ('pricing', 'plans', 'Nos Tarifs', 
   '{"hero": {"title": "Choisissez votre forfait", "subtitle": "Des plans adaptés à chaque besoin"}, "note": "Tous les plans incluent: Support par email, Mises à jour gratuites, Données sécurisées"}'::jsonb, 
   1),
  
  -- Blog Page
  ('blog', 'hero', 'Notre Blog', 
   '{"title": "Actualités et Conseils", "subtitle": "Restez informé des dernières nouveautés et découvrez nos conseils d''experts"}'::jsonb, 
   1)

ON CONFLICT (page, section_key) DO NOTHING;
