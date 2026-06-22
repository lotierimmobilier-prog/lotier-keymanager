/*
  # Create Agency Announcements System

  1. New Tables
    - `agency_announcements`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies)
      - `title` (text) - Title of the announcement
      - `content` (text) - Content of the announcement
      - `type` (text) - Type: 'information', 'tutorial', 'alert'
      - `created_by` (uuid, foreign key to users) - Admin who created it
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_active` (boolean) - Whether the announcement is visible

  2. Security
    - Enable RLS on `agency_announcements` table
    - Add policy for all agency users to read active announcements
    - Add policy for admins to create, update, and delete announcements
*/

CREATE TABLE IF NOT EXISTS agency_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'information',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE agency_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active announcements in their agency"
  ON agency_announcements
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert announcements"
  ON agency_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update their agency announcements"
  ON agency_announcements
  FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete their agency announcements"
  ON agency_announcements
  FOR DELETE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agency_announcements_agency_id ON agency_announcements(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_announcements_created_at ON agency_announcements(created_at DESC);
