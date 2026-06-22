/*
  # Create Agency Menu Preferences System

  This migration creates a system for agencies to customize their dashboard menu order.

  ## 1. New Tables
    - `agency_menu_preferences`: Stores custom menu ordering per agency
      - `id` (uuid, primary key)
      - `agency_id` (uuid): Reference to agencies table
      - `menu_item_id` (text): Identifier for the menu item
      - `display_order` (integer): Order in which to display
      - `is_visible` (boolean): Whether the item is visible
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ## 2. Security
    - Enable RLS on `agency_menu_preferences` table
    - Admin users can manage their agency's menu preferences
    - Super admins can view all menu preferences

  ## 3. Indexes
    - Index on agency_id and display_order for fast lookups
    - Unique constraint on agency_id + menu_item_id
*/

-- Create agency_menu_preferences table
CREATE TABLE IF NOT EXISTS public.agency_menu_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  menu_item_id text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, menu_item_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_menu_prefs_agency ON public.agency_menu_preferences(agency_id);
CREATE INDEX IF NOT EXISTS idx_menu_prefs_order ON public.agency_menu_preferences(agency_id, display_order);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_menu_prefs_updated_at ON public.agency_menu_preferences;
CREATE TRIGGER update_menu_prefs_updated_at
  BEFORE UPDATE ON public.agency_menu_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.agency_menu_preferences ENABLE ROW LEVEL SECURITY;

-- Admin users can view their agency's menu preferences
CREATE POLICY "Admin users can view own agency menu preferences" ON public.agency_menu_preferences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_menu_preferences.agency_id
      AND users.role = 'ADMIN'
    )
  );

-- Admin users can manage their agency's menu preferences
CREATE POLICY "Admin users can insert own agency menu preferences" ON public.agency_menu_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_menu_preferences.agency_id
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admin users can update own agency menu preferences" ON public.agency_menu_preferences
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_menu_preferences.agency_id
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_menu_preferences.agency_id
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admin users can delete own agency menu preferences" ON public.agency_menu_preferences
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_menu_preferences.agency_id
      AND users.role = 'ADMIN'
    )
  );

-- Super admins can view all menu preferences
CREATE POLICY "Super admins can view all menu preferences" ON public.agency_menu_preferences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.is_super_admin = true
    )
  );
