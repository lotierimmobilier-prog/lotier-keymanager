/*
  # Intégration complète de Stripe

  1. Nouvelles Tables
    - `stripe_customers` - Mapping utilisateurs Supabase <-> clients Stripe
    - `stripe_subscriptions` - État des abonnements Stripe
    - `stripe_orders` - Commandes one-time payment

  2. Modifications
    - Ajout de `stripe_price_id` dans la table `plans`
    - Ajout de `stripe_subscription_id` dans la table `subscriptions`

  3. Sécurité
    - RLS activé sur toutes les tables
    - Les utilisateurs peuvent voir leurs propres données
    - Seuls les super admins peuvent tout voir

  4. Notes importantes
    - Prêt pour la configuration Stripe ultérieure
    - Les price_id seront ajoutés manuellement après configuration
*/

-- Table pour le mapping des clients Stripe
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_customer_id ON stripe_customers(customer_id);

-- Table pour les abonnements Stripe
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL UNIQUE REFERENCES stripe_customers(customer_id) ON DELETE CASCADE,
  subscription_id text UNIQUE,
  price_id text,
  subscription_status text DEFAULT 'not_started',
  status text DEFAULT 'not_started',
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON stripe_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_subscription_id ON stripe_subscriptions(subscription_id);

-- Table pour les commandes one-time
CREATE TABLE IF NOT EXISTS stripe_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id text NOT NULL UNIQUE,
  payment_intent_id text,
  customer_id text NOT NULL REFERENCES stripe_customers(customer_id) ON DELETE CASCADE,
  amount_subtotal bigint,
  amount_total bigint,
  currency text,
  payment_status text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_orders_customer_id ON stripe_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_orders_checkout_session_id ON stripe_orders(checkout_session_id);

-- Ajouter stripe_price_id aux plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE plans ADD COLUMN stripe_price_id text;
  END IF;
END $$;

-- Ajouter stripe_subscription_id aux subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;

-- Trigger pour update_at sur stripe_subscriptions
CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour update_at sur stripe_orders
CREATE TRIGGER update_stripe_orders_updated_at
  BEFORE UPDATE ON stripe_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

-- Policies pour stripe_customers
CREATE POLICY "Users can view their own stripe customer data"
  ON stripe_customers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all stripe customers"
  ON stripe_customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Policies pour stripe_subscriptions
CREATE POLICY "Users can view their own stripe subscription"
  ON stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all stripe subscriptions"
  ON stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Policies pour stripe_orders
CREATE POLICY "Users can view their own stripe orders"
  ON stripe_orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all stripe orders"
  ON stripe_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Note: Les INSERT/UPDATE/DELETE pour ces tables sont gérés par les edge functions Stripe
-- avec le service role key, donc pas besoin de policies pour ces opérations
