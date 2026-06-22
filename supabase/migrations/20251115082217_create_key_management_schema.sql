/*
  # Key Management SaaS - Complete Database Schema

  ## Overview
  Multi-tenant key management system for real estate agencies with subscription-based pricing.

  ## New Tables Created

  ### 1. plans
  Subscription plans with pricing tiers based on number of keys
  - `id` (uuid, PK)
  - `name` (text) - Plan name (Free, Starter, etc.)
  - `included_keys` (integer) - Number of keys included in base price
  - `base_price` (decimal) - Base monthly price in euros
  - `extra_step` (integer) - Number of keys per additional tier
  - `extra_price` (decimal) - Price per additional tier
  - `created_at` (timestamptz)

  ### 2. agencies
  Real estate agencies (multi-tenant root)
  - `id` (uuid, PK)
  - `name` (text) - Agency name
  - `address` (text) - Agency address
  - `plan_id` (uuid, FK to plans) - Current subscription plan
  - `max_keys` (integer) - Maximum allowed keys based on subscription
  - `created_at` (timestamptz)

  ### 3. users
  Agency users with roles
  - `id` (uuid, PK) - Links to auth.users
  - `agency_id` (uuid, FK to agencies)
  - `first_name` (text)
  - `last_name` (text)
  - `email` (text, unique)
  - `role` (text) - ADMIN, COLLAB, PRESTATAIRE
  - `created_at` (timestamptz)

  ### 4. properties
  Real estate properties managed by agencies
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK to agencies)
  - `reference` (text) - Property reference code
  - `address` (text) - Property address
  - `type` (text) - Property type (apartment, house, etc.)
  - `created_at` (timestamptz)

  ### 5. keys
  Physical keys linked to properties
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK to agencies)
  - `property_id` (uuid, FK to properties)
  - `label` (text) - Key label/identifier
  - `code` (text) - Key code if applicable
  - `status` (text) - AVAILABLE, OUT, LOST, ARCHIVED
  - `created_at` (timestamptz)

  ### 6. key_movements
  Complete audit trail of key check-outs and check-ins
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK to agencies)
  - `key_id` (uuid, FK to keys)
  - `taken_by_user_id` (uuid, FK to users)
  - `given_to_name` (text) - Name of person who received key
  - `purpose` (text) - Reason for taking key
  - `out_at` (timestamptz) - Check-out timestamp
  - `expected_return_at` (timestamptz) - Expected return time
  - `returned_at` (timestamptz, nullable) - Actual return time
  - `notes` (text)
  - `responsibility_transferred` (boolean) - If responsibility was transferred
  - `created_at` (timestamptz)

  ### 7. subscriptions
  Stripe subscription tracking
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK to agencies)
  - `plan_id` (uuid, FK to plans)
  - `stripe_subscription_id` (text)
  - `current_keys_limit` (integer)
  - `status` (text) - active, canceled, past_due, etc.
  - `trial_end_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 8. agency_options
  Optional add-ons for agencies
  - `id` (uuid, PK)
  - `agency_id` (uuid, FK to agencies)
  - `option_name` (text)
  - `price` (decimal)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access data from their own agency
  - Admins have full access within their agency
  - Service role bypasses RLS for system operations

  ## Important Notes
  1. Multi-tenant isolation via agency_id on all business tables
  2. Key quota enforcement happens at application level before insert
  3. Stripe webhooks will update subscriptions table
  4. Default free plan allows up to 10 keys
  5. Price calculation: base_price + (ceil((keys - included_keys) / extra_step) * extra_price)
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  included_keys integer NOT NULL DEFAULT 0,
  base_price decimal(10,2) NOT NULL DEFAULT 0,
  extra_step integer NOT NULL DEFAULT 20,
  extra_price decimal(10,2) NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans are publicly readable for pricing page
CREATE POLICY "Plans are viewable by everyone"
  ON plans FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  plan_id uuid REFERENCES plans(id),
  max_keys integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Create users table (will add policies after table exists)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'COLLAB', 'PRESTATAIRE')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Now add agency policies that reference users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agencies' AND policyname = 'Users can view their own agency'
  ) THEN
    CREATE POLICY "Users can view their own agency"
      ON agencies FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT agency_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agencies' AND policyname = 'Users can update their own agency'
  ) THEN
    CREATE POLICY "Users can update their own agency"
      ON agencies FOR UPDATE
      TO authenticated
      USING (
        id IN (
          SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
        )
      )
      WITH CHECK (
        id IN (
          SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- Add users table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view users in their agency'
  ) THEN
    CREATE POLICY "Users can view users in their agency"
      ON users FOR SELECT
      TO authenticated
      USING (
        agency_id IN (
          SELECT agency_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can insert users in their agency'
  ) THEN
    CREATE POLICY "Admins can insert users in their agency"
      ON users FOR INSERT
      TO authenticated
      WITH CHECK (
        agency_id IN (
          SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can update users in their agency'
  ) THEN
    CREATE POLICY "Admins can update users in their agency"
      ON users FOR UPDATE
      TO authenticated
      USING (
        agency_id IN (
          SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
        )
      )
      WITH CHECK (
        agency_id IN (
          SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can delete users in their agency'
  ) THEN
    CREATE POLICY "Admins can delete users in their agency"
      ON users FOR DELETE
      TO authenticated
      USING (
        agency_id IN (
          SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  reference text NOT NULL,
  address text NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view properties in their agency"
  ON properties FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert properties in their agency"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update properties in their agency"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete properties in their agency"
  ON properties FOR DELETE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Create keys table
CREATE TABLE IF NOT EXISTS keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OUT', 'LOST', 'ARCHIVED')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view keys in their agency"
  ON keys FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert keys in their agency"
  ON keys FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update keys in their agency"
  ON keys FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete keys in their agency"
  ON keys FOR DELETE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Create key_movements table
CREATE TABLE IF NOT EXISTS key_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  key_id uuid REFERENCES keys(id) ON DELETE CASCADE NOT NULL,
  taken_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  given_to_name text NOT NULL,
  purpose text,
  out_at timestamptz NOT NULL DEFAULT now(),
  expected_return_at timestamptz NOT NULL,
  returned_at timestamptz,
  notes text,
  responsibility_transferred boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE key_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movements in their agency"
  ON key_movements FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert movements in their agency"
  ON key_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update movements in their agency"
  ON key_movements FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id uuid REFERENCES plans(id) NOT NULL,
  stripe_subscription_id text,
  current_keys_limit integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active',
  trial_end_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their agency subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Create agency_options table
CREATE TABLE IF NOT EXISTS agency_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  option_name text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agency_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency options"
  ON agency_options FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Insert default plans
INSERT INTO plans (name, included_keys, base_price, extra_step, extra_price) VALUES
  ('Free', 10, 0, 20, 10),
  ('Starter', 30, 19, 20, 10),
  ('Professional', 50, 29, 20, 10),
  ('Enterprise', 100, 49, 20, 10)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_keys_agency_id ON keys(agency_id);
CREATE INDEX IF NOT EXISTS idx_keys_status ON keys(status);
CREATE INDEX IF NOT EXISTS idx_keys_property_id ON keys(property_id);
CREATE INDEX IF NOT EXISTS idx_key_movements_agency_id ON key_movements(agency_id);
CREATE INDEX IF NOT EXISTS idx_key_movements_key_id ON key_movements(key_id);
CREATE INDEX IF NOT EXISTS idx_key_movements_returned_at ON key_movements(returned_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_agency_id ON subscriptions(agency_id);