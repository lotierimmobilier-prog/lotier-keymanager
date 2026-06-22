/*
  # Fix Site Content Sections RLS Policies

  This migration fixes the RLS policies for site_content_sections to use is_super_admin instead of role check.

  ## Changes
  - Drop existing super admin policies
  - Recreate policies checking is_super_admin = true instead of role = 'SUPER_ADMIN'

  ## Security
  - Super admins (users with is_super_admin = true) can manage all site content
  - Public users can view active content
*/

-- Drop existing super admin policies
DROP POLICY IF EXISTS "Super admins can view all site content" ON public.site_content_sections;
DROP POLICY IF EXISTS "Super admins can insert site content" ON public.site_content_sections;
DROP POLICY IF EXISTS "Super admins can update site content" ON public.site_content_sections;
DROP POLICY IF EXISTS "Super admins can delete site content" ON public.site_content_sections;

-- Recreate policies with correct is_super_admin check

CREATE POLICY "Super admins can view all site content" ON public.site_content_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can insert site content" ON public.site_content_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can update site content" ON public.site_content_sections
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.is_super_admin = true
    )
  );

CREATE POLICY "Super admins can delete site content" ON public.site_content_sections
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.is_super_admin = true
    )
  );
