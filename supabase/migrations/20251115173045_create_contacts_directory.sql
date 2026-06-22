/*
  # Create Contacts Directory System

  This migration creates a contacts directory for each agency to manage people who can receive keys.

  ## New Tables

  ### contacts
  Directory of people authorized to receive keys
  - `id` (uuid, PK) - Unique identifier
  - `agency_id` (uuid, FK to agencies) - Agency that owns this contact
  - `first_name` (text) - Contact first name
  - `last_name` (text) - Contact last name
  - `company` (text) - Company name
  - `phone` (text) - Phone number
  - `email` (text) - Email address
  - `notes` (text, nullable) - Additional notes
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled on contacts table
  - Users can only access contacts from their agency
  - All CRUD operations restricted to agency members

  ## Important Notes
  - Contacts are agency-specific for multi-tenant isolation
  - Supports both manual entry and CSV import
  - Phone and email are optional but recommended
*/

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts

-- Users can view contacts in their agency
CREATE POLICY "Users can view contacts in their agency"
  ON contacts FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()));

-- Users can insert contacts in their agency
CREATE POLICY "Users can insert contacts in their agency"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

-- Users can update contacts in their agency
CREATE POLICY "Users can update contacts in their agency"
  ON contacts FOR UPDATE
  TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()))
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

-- Users can delete contacts in their agency
CREATE POLICY "Users can delete contacts in their agency"
  ON contacts FOR DELETE
  TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_agency_id ON contacts(agency_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON contacts(last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS contacts_updated_at_trigger ON contacts;
CREATE TRIGGER contacts_updated_at_trigger
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();
