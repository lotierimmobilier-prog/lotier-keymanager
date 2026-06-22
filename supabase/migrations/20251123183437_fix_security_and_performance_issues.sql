/*
  # Fix Security and Performance Issues

  This migration addresses multiple security and performance issues identified by Supabase:

  ## 1. Unindexed Foreign Keys
  Adds indexes to all foreign key columns to improve query performance:
  - agencies.plan_id
  - agency_announcements.created_by
  - agency_options.agency_id
  - impersonation_sessions.impersonated_user_id
  - key_movements.deleted_by, modified_by, taken_by_user_id
  - purchase_orders.approved_by_admin_id, plan_id, requested_by_user_id
  - sms_logs.contact_id
  - subscriptions.plan_id
  - users.banned_by

  ## 2. RLS Performance Optimization
  Wraps all auth.uid() calls with (SELECT auth.uid()) to prevent re-evaluation for each row.
  This significantly improves query performance at scale.

  ## 3. Multiple Permissive Policies Cleanup
  Removes duplicate policies that create confusion and potential security issues.

  ## 4. Function Security
  Sets explicit search_path on all functions to prevent search path manipulation attacks.

  ## Notes
  - Unused indexes are intentionally kept as they may be needed for future queries
  - Password protection should be enabled in Supabase Auth settings (not SQL-controllable)
*/

-- =====================================================
-- PART 1: Add Missing Foreign Key Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_agencies_plan_id ON public.agencies(plan_id);
CREATE INDEX IF NOT EXISTS idx_agency_announcements_created_by ON public.agency_announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_agency_options_agency_id ON public.agency_options(agency_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_impersonated_user ON public.impersonation_sessions(impersonated_user_id);
CREATE INDEX IF NOT EXISTS idx_key_movements_deleted_by ON public.key_movements(deleted_by);
CREATE INDEX IF NOT EXISTS idx_key_movements_modified_by ON public.key_movements(modified_by);
CREATE INDEX IF NOT EXISTS idx_key_movements_taken_by_user_id ON public.key_movements(taken_by_user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_by ON public.purchase_orders(approved_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_plan_id ON public.purchase_orders(plan_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_requested_by ON public.purchase_orders(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_contact_id ON public.sms_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_users_banned_by ON public.users(banned_by);

-- =====================================================
-- PART 2: Fix RLS Policies - Replace auth.uid() with (SELECT auth.uid())
-- =====================================================

-- Drop and recreate all policies with optimized auth.uid() calls

-- AGENCIES
DROP POLICY IF EXISTS "Users can view their own agency" ON public.agencies;
CREATE POLICY "Users can view their own agency" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agencies.id
    )
  );

DROP POLICY IF EXISTS "Users can update their own agency" ON public.agencies;
CREATE POLICY "Users can update their own agency" ON public.agencies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agencies.id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Super admins can view all agencies" ON public.agencies;
CREATE POLICY "Super admins can view all agencies" ON public.agencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- PROPERTIES
DROP POLICY IF EXISTS "Users can view properties in their agency" ON public.properties;
CREATE POLICY "Users can view properties in their agency" ON public.properties
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = properties.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can insert properties in their agency" ON public.properties;
CREATE POLICY "Users can insert properties in their agency" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = properties.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can update properties in their agency" ON public.properties;
CREATE POLICY "Users can update properties in their agency" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = properties.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can delete properties in their agency" ON public.properties;
CREATE POLICY "Users can delete properties in their agency" ON public.properties
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = properties.agency_id
    )
  );

DROP POLICY IF EXISTS "Super admins can view all properties" ON public.properties;
CREATE POLICY "Super admins can view all properties" ON public.properties
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- KEYS
DROP POLICY IF EXISTS "Users can view keys in their agency" ON public.keys;
CREATE POLICY "Users can view keys in their agency" ON public.keys
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = keys.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can insert keys in their agency" ON public.keys;
CREATE POLICY "Users can insert keys in their agency" ON public.keys
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = keys.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can update keys in their agency" ON public.keys;
CREATE POLICY "Users can update keys in their agency" ON public.keys
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = keys.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can delete keys in their agency" ON public.keys;
CREATE POLICY "Users can delete keys in their agency" ON public.keys
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = keys.agency_id
    )
  );

DROP POLICY IF EXISTS "Super admins can view all keys" ON public.keys;
CREATE POLICY "Super admins can view all keys" ON public.keys
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- KEY_MOVEMENTS
DROP POLICY IF EXISTS "Users can view movements in their agency" ON public.key_movements;
CREATE POLICY "Users can view movements in their agency" ON public.key_movements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = key_movements.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can insert movements in their agency" ON public.key_movements;
CREATE POLICY "Users can insert movements in their agency" ON public.key_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = key_movements.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can update movements in their agency" ON public.key_movements;
CREATE POLICY "Users can update movements in their agency" ON public.key_movements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = key_movements.agency_id
    )
  );

DROP POLICY IF EXISTS "Super admins can view all movements" ON public.key_movements;
CREATE POLICY "Super admins can view all movements" ON public.key_movements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can view their agency subscription" ON public.subscriptions;
CREATE POLICY "Users can view their agency subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = subscriptions.agency_id
    )
  );

DROP POLICY IF EXISTS "Admins can update their agency subscription" ON public.subscriptions;
CREATE POLICY "Admins can update their agency subscription" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = subscriptions.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- AGENCY_OPTIONS
DROP POLICY IF EXISTS "Users can view their agency options" ON public.agency_options;
CREATE POLICY "Users can view their agency options" ON public.agency_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_options.agency_id
    )
  );

-- CONTACTS
DROP POLICY IF EXISTS "Users can view contacts in their agency" ON public.contacts;
CREATE POLICY "Users can view contacts in their agency" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = contacts.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can insert contacts in their agency" ON public.contacts;
CREATE POLICY "Users can insert contacts in their agency" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = contacts.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can update contacts in their agency" ON public.contacts;
CREATE POLICY "Users can update contacts in their agency" ON public.contacts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = contacts.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can delete contacts in their agency" ON public.contacts;
CREATE POLICY "Users can delete contacts in their agency" ON public.contacts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = contacts.agency_id
    )
  );

DROP POLICY IF EXISTS "Super admins can view all contacts" ON public.contacts;
CREATE POLICY "Super admins can view all contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- AGENCY_SETTINGS
DROP POLICY IF EXISTS "Users can view their agency settings" ON public.agency_settings;
CREATE POLICY "Users can view their agency settings" ON public.agency_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_settings.agency_id
    )
  );

DROP POLICY IF EXISTS "Admins can insert agency settings" ON public.agency_settings;
CREATE POLICY "Admins can insert agency settings" ON public.agency_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_settings.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can update agency settings" ON public.agency_settings;
CREATE POLICY "Admins can update agency settings" ON public.agency_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_settings.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- USERS
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "super_admins_update_any_user" ON public.users;
CREATE POLICY "super_admins_update_any_user" ON public.users
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.role = 'SUPER_ADMIN'
    )
  );

-- AGENCY_ANNOUNCEMENTS
DROP POLICY IF EXISTS "Users can view active announcements in their agency" ON public.agency_announcements;
CREATE POLICY "Users can view active announcements in their agency" ON public.agency_announcements
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_announcements.agency_id
    )
  );

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.agency_announcements;
CREATE POLICY "Admins can insert announcements" ON public.agency_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_announcements.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can update their agency announcements" ON public.agency_announcements;
CREATE POLICY "Admins can update their agency announcements" ON public.agency_announcements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_announcements.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can delete their agency announcements" ON public.agency_announcements;
CREATE POLICY "Admins can delete their agency announcements" ON public.agency_announcements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = agency_announcements.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- SMS_TEMPLATES
DROP POLICY IF EXISTS "Super admins can manage all SMS templates" ON public.sms_templates;
CREATE POLICY "Super admins can manage all SMS templates" ON public.sms_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- SMS_LOGS
DROP POLICY IF EXISTS "Users can view SMS logs in their agency" ON public.sms_logs;
CREATE POLICY "Users can view SMS logs in their agency" ON public.sms_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = sms_logs.agency_id
    )
  );

DROP POLICY IF EXISTS "Users can insert SMS logs in their agency" ON public.sms_logs;
CREATE POLICY "Users can insert SMS logs in their agency" ON public.sms_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = sms_logs.agency_id
    )
  );

-- STRIPE_CUSTOMERS
DROP POLICY IF EXISTS "Users can view their own customer data" ON public.stripe_customers;
DROP POLICY IF EXISTS "Users can view their own stripe customer data" ON public.stripe_customers;
CREATE POLICY "Users can view their own stripe customer data" ON public.stripe_customers
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all stripe customers" ON public.stripe_customers;
CREATE POLICY "Super admins can view all stripe customers" ON public.stripe_customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- STRIPE_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can view their own subscription data" ON public.stripe_subscriptions;
DROP POLICY IF EXISTS "Users can view their own stripe subscription" ON public.stripe_subscriptions;
CREATE POLICY "Users can view their own stripe subscription" ON public.stripe_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stripe_customers
      WHERE stripe_customers.customer_id = stripe_subscriptions.customer_id
      AND stripe_customers.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all stripe subscriptions" ON public.stripe_subscriptions;
CREATE POLICY "Super admins can view all stripe subscriptions" ON public.stripe_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- STRIPE_ORDERS
DROP POLICY IF EXISTS "Users can view their own order data" ON public.stripe_orders;
DROP POLICY IF EXISTS "Users can view their own stripe orders" ON public.stripe_orders;
CREATE POLICY "Users can view their own stripe orders" ON public.stripe_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stripe_customers
      WHERE stripe_customers.customer_id = stripe_orders.customer_id
      AND stripe_customers.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all stripe orders" ON public.stripe_orders;
CREATE POLICY "Super admins can view all stripe orders" ON public.stripe_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- IMPERSONATION_SESSIONS
DROP POLICY IF EXISTS "Super admins can view all impersonation sessions" ON public.impersonation_sessions;
CREATE POLICY "Super admins can view all impersonation sessions" ON public.impersonation_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can create impersonation sessions" ON public.impersonation_sessions;
CREATE POLICY "Super admins can create impersonation sessions" ON public.impersonation_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can update their impersonation sessions" ON public.impersonation_sessions;
CREATE POLICY "Super admins can update their impersonation sessions" ON public.impersonation_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- PURCHASE_ORDERS
DROP POLICY IF EXISTS "Users can view their agency purchase orders" ON public.purchase_orders;
CREATE POLICY "Users can view their agency purchase orders" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = purchase_orders.agency_id
    )
  );

DROP POLICY IF EXISTS "Admins can create purchase orders" ON public.purchase_orders;
CREATE POLICY "Admins can create purchase orders" ON public.purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = purchase_orders.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Admins can update pending purchase orders" ON public.purchase_orders;
CREATE POLICY "Admins can update pending purchase orders" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (
    status = 'PENDING'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.agency_id = purchase_orders.agency_id
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS "Super admins can view all purchase orders" ON public.purchase_orders;
CREATE POLICY "Super admins can view all purchase orders" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can update all purchase orders" ON public.purchase_orders;
CREATE POLICY "Super admins can update all purchase orders" ON public.purchase_orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- PLAN_FEATURES
DROP POLICY IF EXISTS "Super admins can insert plan features" ON public.plan_features;
CREATE POLICY "Super admins can insert plan features" ON public.plan_features
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can update plan features" ON public.plan_features;
CREATE POLICY "Super admins can update plan features" ON public.plan_features
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can delete plan features" ON public.plan_features;
CREATE POLICY "Super admins can delete plan features" ON public.plan_features
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- BLOG_ARTICLES
DROP POLICY IF EXISTS "Super admins can view all articles" ON public.blog_articles;
CREATE POLICY "Super admins can view all articles" ON public.blog_articles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can insert articles" ON public.blog_articles;
CREATE POLICY "Super admins can insert articles" ON public.blog_articles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can update articles" ON public.blog_articles;
CREATE POLICY "Super admins can update articles" ON public.blog_articles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Super admins can delete articles" ON public.blog_articles;
CREATE POLICY "Super admins can delete articles" ON public.blog_articles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- =====================================================
-- PART 3: Fix Function Search Paths
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_subscription_to_agency()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.agencies
  SET plan_id = NEW.plan_id
  WHERE id = NEW.agency_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  new_order_number TEXT;
  max_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0)
  INTO max_number
  FROM public.purchase_orders
  WHERE order_number ~ '^PO-[0-9]+$';
  
  new_order_number := 'PO-' || LPAD((max_number + 1)::TEXT, 6, '0');
  RETURN new_order_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_blog_article_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_agency_id(user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  agency_id_result UUID;
BEGIN
  SELECT agency_id INTO agency_id_result
  FROM public.users
  WHERE id = user_id;
  
  RETURN agency_id_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agency_settings_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contacts_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_property_reference()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  base_pattern TEXT;
  counter INTEGER;
  new_reference TEXT;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference != '' THEN
    RETURN NEW;
  END IF;

  IF NEW.service_type = 'GESTION' THEN
    base_pattern := 'G';
  ELSIF NEW.service_type = 'SYNDIC' THEN
    base_pattern := 'S';
  ELSIF NEW.service_type = 'LOCATION' THEN
    base_pattern := 'L';
  ELSE
    base_pattern := 'B';
  END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM LENGTH(base_pattern) + 2) AS INTEGER)), 0)
  INTO counter
  FROM public.properties
  WHERE agency_id = NEW.agency_id
    AND reference ~ ('^' || base_pattern || '-[0-9]+$');

  new_reference := base_pattern || '-' || LPAD((counter + 1)::TEXT, 5, '0');
  NEW.reference := new_reference;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_key_reference()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  property_ref TEXT;
  counter INTEGER;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference != '' THEN
    RETURN NEW;
  END IF;

  SELECT reference INTO property_ref
  FROM public.properties
  WHERE id = NEW.property_id;

  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM LENGTH(property_ref) + 3) AS INTEGER)), 0)
  INTO counter
  FROM public.keys
  WHERE property_id = NEW.property_id
    AND reference ~ ('^' || property_ref || '-K[0-9]+$');

  NEW.reference := property_ref || '-K' || LPAD((counter + 1)::TEXT, 3, '0');

  RETURN NEW;
END;
$$;
