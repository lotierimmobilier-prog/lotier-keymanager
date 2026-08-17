/*
  # Cloisonner les agences au niveau de la base de données

  ## Problème corrigé

  Jusqu'ici, les règles de sécurité (RLS) de KeyManager reposaient sur le principe
  énoncé par la migration `20251116072525_simplify_all_rls_policies.sql` :
  « Application enforces agency boundaries » — c'est-à-dire que le cloisonnement
  entre agences était assuré par l'interface, pas par la base.

  Or l'interface est du code JavaScript exécuté dans le navigateur du client :
  elle ne peut rien garantir. Un utilisateur légitime de n'importe quelle agence
  pouvait, depuis la console de son navigateur :

  1. lire les biens, clés, mouvements et contacts de toutes les autres agences ;
  2. les modifier et les supprimer ;
  3. lire la liste complète des utilisateurs de toutes les agences ;
  4. **se promouvoir super administrateur** (`UPDATE users SET is_super_admin = true`) ;
  5. changer son agence de rattachement ;
  6. supprimer le compte d'un utilisateur d'une autre agence ;
  7. créer des enregistrements au nom d'une autre agence.

  Ces sept points ont été reproduits et vérifiés sur une réplique locale du schéma.

  La cause n'est pas l'absence de bonnes politiques — elles existaient déjà
  (« Users can view keys in their agency »…). C'est leur **coexistence** avec des
  politiques `USING (true)`. PostgreSQL combine les politiques permissives par un
  OU logique : une seule politique « tout le monde voit tout » annule toutes les
  autres.

  ## Deuxième problème corrigé : le bypass super administrateur ne fonctionnait pas

  31 politiques accordent des droits étendus à un utilisateur dont
  `users.role = 'SUPER_ADMIN'`. Mais la contrainte CHECK de la table `users`
  n'autorise que 'ADMIN', 'COLLAB' et 'PRESTATAIRE' : cette valeur ne peut pas
  exister. L'application, elle, utilise la colonne booléenne `is_super_admin`.

  Ces 31 politiques étaient donc sans effet. Cela ne se voyait pas, puisque les
  politiques `USING (true)` donnaient déjà tous les droits à tout le monde.
  Les retirer sans réparer le bypass aurait privé le super administrateur de
  l'accès aux agences clientes.

  ## Ce que fait cette migration

  1. des fonctions d'aide en `SECURITY DEFINER`, qui lisent l'agence et le statut
     de l'utilisateur connecté sans déclencher de récursion RLS ;
  2. le retrait des politiques permissives sur les 8 tables concernées ;
  3. les politiques manquantes sur `users`, `subscriptions` et `dashboard_content` ;
  4. la réparation des 31 politiques super administrateur ;
  5. un garde-fou empêchant l'élévation de privilèges par modification de son
     propre profil.

  ## Décision à confirmer

  Le super administrateur conserve un accès **en lecture et en écriture** à toutes
  les agences. C'est le comportement actuel du produit (écran « Super Admin » et
  mode « prise de contrôle »), qui repose sur des indicateurs stockés dans le
  navigateur : la session Supabase reste celle du super administrateur. Restreindre
  ce bypass à la lecture seule casserait la prise de contrôle.

  ## Réversibilité

  Cette migration ne supprime aucune donnée et ne modifie aucune colonne. Elle ne
  touche que des politiques et des fonctions. Un retour arrière consiste à
  recréer les politiques `USING (true)` retirées (voir la section 2).
*/

-- =============================================================================
-- 1. Fonctions d'aide
-- =============================================================================
-- SECURITY DEFINER : ces fonctions s'exécutent avec les droits de leur
-- propriétaire, donc sans repasser par les politiques RLS de `users`. C'est ce
-- qui évite la récursion infinie qui avait conduit, en novembre 2025, à
-- abandonner le cloisonnement (« fix_users_rls_no_recursion »).
--
-- STABLE : le résultat ne change pas pendant la requête, PostgreSQL peut donc
-- l'évaluer une seule fois plutôt qu'à chaque ligne.

CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.agency_id
  FROM public.users u
  WHERE u.id = (SELECT auth.uid())
    AND COALESCE(u.is_banned, false) = false
$$;

COMMENT ON FUNCTION public.current_agency_id() IS
  'Agence de rattachement de l''utilisateur connecté. NULL s''il est banni ou inconnu.';

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT u.is_super_admin AND COALESCE(u.is_banned, false) = false
     FROM public.users u
     WHERE u.id = (SELECT auth.uid())),
    false)
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Vrai si l''utilisateur connecté est super administrateur et non banni.';

CREATE OR REPLACE FUNCTION public.is_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT u.role = 'ADMIN' AND COALESCE(u.is_banned, false) = false
     FROM public.users u
     WHERE u.id = (SELECT auth.uid())),
    false)
$$;

COMMENT ON FUNCTION public.is_agency_admin() IS
  'Vrai si l''utilisateur connecté est administrateur de son agence et non banni.';

REVOKE ALL ON FUNCTION public.current_agency_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin()    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_agency_admin()   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_agency_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin()    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_agency_admin()   TO authenticated, service_role;

-- =============================================================================
-- 2. Retrait des politiques permissives
-- =============================================================================
-- Ce sont elles qui annulaient le cloisonnement. Pour revenir en arrière, il
-- suffirait de les recréer à l'identique : FOR SELECT / FOR ALL TO authenticated
-- USING (true) WITH CHECK (true).
--
-- Ne sont PAS retirées, car légitimement publiques ou globales :
--   plans, plan_features       -> page de tarifs, consultable avant connexion
--   qr_scan_logs (INSERT)      -> journalisation d'un scan par un visiteur
--   sms_templates (SELECT)     -> modèles de SMS communs à toutes les agences
--   dashboard_content (SELECT actif) -> contenu éditorial commun

DROP POLICY IF EXISTS "authenticated_select_agencies"      ON public.agencies;
DROP POLICY IF EXISTS "authenticated_manage_agencies"      ON public.agencies;
DROP POLICY IF EXISTS "authenticated_select_properties"    ON public.properties;
DROP POLICY IF EXISTS "authenticated_manage_properties"    ON public.properties;
DROP POLICY IF EXISTS "authenticated_select_keys"          ON public.keys;
DROP POLICY IF EXISTS "authenticated_manage_keys"          ON public.keys;
DROP POLICY IF EXISTS "authenticated_select_movements"     ON public.key_movements;
DROP POLICY IF EXISTS "authenticated_manage_movements"     ON public.key_movements;
DROP POLICY IF EXISTS "authenticated_select_contacts"      ON public.contacts;
DROP POLICY IF EXISTS "authenticated_manage_contacts"      ON public.contacts;
DROP POLICY IF EXISTS "authenticated_select_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "authenticated_manage_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "authenticated_users_select_all"     ON public.users;
DROP POLICY IF EXISTS "authenticated_users_insert"         ON public.users;
DROP POLICY IF EXISTS "authenticated_users_delete"         ON public.users;
DROP POLICY IF EXISTS "authenticated_select_all_content"   ON public.dashboard_content;
DROP POLICY IF EXISTS "authenticated_manage_content"       ON public.dashboard_content;

-- =============================================================================
-- 3. Politiques manquantes
-- =============================================================================

-- --- users -------------------------------------------------------------------
-- Un utilisateur voit les comptes de sa propre agence (nécessaire pour attribuer
-- une clé à un collègue). Il ne voit plus ceux des autres agences.

CREATE POLICY "users_select_same_agency"
  ON public.users FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR agency_id = public.current_agency_id()
    OR public.is_super_admin()
  );

-- Création d'un compte : réservée à l'administrateur de l'agence concernée.
-- Le parcours d'inscription publique passe par la fonction serveur
-- `complete-signup`, qui utilise la clé service_role et n'est pas soumise à RLS.
CREATE POLICY "users_insert_by_agency_admin"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (
    (agency_id = public.current_agency_id() AND public.is_agency_admin())
    OR public.is_super_admin()
  );

-- Suppression : administrateur de l'agence, et jamais son propre compte.
CREATE POLICY "users_delete_by_agency_admin"
  ON public.users FOR DELETE TO authenticated
  USING (
    (
      agency_id = public.current_agency_id()
      AND public.is_agency_admin()
      AND id <> (SELECT auth.uid())
    )
    OR public.is_super_admin()
  );

-- Un administrateur peut modifier les comptes de son agence (rôle, bannissement).
-- La politique `users_update_own` existante couvre la modification de son propre
-- profil ; le garde-fou de la section 5 empêche l'élévation de privilèges.
CREATE POLICY "users_update_by_agency_admin"
  ON public.users FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id() AND public.is_agency_admin())
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

-- --- subscriptions -----------------------------------------------------------
-- L'application fait un `upsert` sur cette table ; il lui faut donc INSERT.
CREATE POLICY "subscriptions_insert_by_agency_admin"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    (agency_id = public.current_agency_id() AND public.is_agency_admin())
    OR public.is_super_admin()
  );

-- --- dashboard_content -------------------------------------------------------
-- Contenu éditorial commun : lecture par tous, écriture par le super administrateur.
CREATE POLICY "dashboard_content_select_authenticated"
  ON public.dashboard_content FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "dashboard_content_manage_super_admin"
  ON public.dashboard_content FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- =============================================================================
-- 4. Réparation du bypass super administrateur
-- =============================================================================
-- Les 31 politiques existantes testent `users.role = 'SUPER_ADMIN'`, valeur que
-- la contrainte CHECK de `users` interdit : elles ne peuvent jamais s'appliquer.
-- On les retire et on les remplace par des politiques fondées sur la colonne
-- `is_super_admin`, celle qu'utilise réellement l'application.

-- 4.a — Politiques purement « super administrateur »
DROP POLICY IF EXISTS "Super admins can view all agencies"               ON public.agencies;
DROP POLICY IF EXISTS "Super admins can view all properties"             ON public.properties;
DROP POLICY IF EXISTS "Super admins can view all keys"                   ON public.keys;
DROP POLICY IF EXISTS "Super admins can view all movements"              ON public.key_movements;
DROP POLICY IF EXISTS "Super admins can view all contacts"               ON public.contacts;
DROP POLICY IF EXISTS "Super admins can view all articles"               ON public.blog_articles;
DROP POLICY IF EXISTS "Super admins can insert articles"                 ON public.blog_articles;
DROP POLICY IF EXISTS "Super admins can update articles"                 ON public.blog_articles;
DROP POLICY IF EXISTS "Super admins can delete articles"                 ON public.blog_articles;
DROP POLICY IF EXISTS "Super admins can insert plan features"            ON public.plan_features;
DROP POLICY IF EXISTS "Super admins can update plan features"            ON public.plan_features;
DROP POLICY IF EXISTS "Super admins can delete plan features"            ON public.plan_features;
DROP POLICY IF EXISTS "Super admins can view all purchase orders"        ON public.purchase_orders;
DROP POLICY IF EXISTS "Super admins can update all purchase orders"      ON public.purchase_orders;
DROP POLICY IF EXISTS "Super admins can manage all SMS templates"        ON public.sms_templates;
DROP POLICY IF EXISTS "Super admins can view all stripe customers"       ON public.stripe_customers;
DROP POLICY IF EXISTS "Super admins can view all stripe orders"          ON public.stripe_orders;
DROP POLICY IF EXISTS "Super admins can view all stripe subscriptions"   ON public.stripe_subscriptions;
DROP POLICY IF EXISTS "Super admins can view all impersonation sessions" ON public.impersonation_sessions;
DROP POLICY IF EXISTS "Super admins can create impersonation sessions"   ON public.impersonation_sessions;
DROP POLICY IF EXISTS "Super admins can update their impersonation sessions" ON public.impersonation_sessions;
DROP POLICY IF EXISTS "super_admins_update_any_user"                     ON public.users;

-- Accès complet du super administrateur, table par table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agencies', 'properties', 'keys', 'key_movements', 'contacts',
    'blog_articles', 'plan_features', 'plans', 'purchase_orders',
    'sms_templates', 'sms_logs', 'subscriptions', 'users',
    'agency_announcements', 'agency_settings', 'agency_options',
    'key_qr_codes', 'property_qr_codes', 'qr_scan_logs',
    'stripe_customers', 'stripe_orders', 'stripe_subscriptions',
    'impersonation_sessions'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'super_admin_all_' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
        'USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())',
        'super_admin_all_' || t, t);
    END IF;
  END LOOP;
END $$;

-- 4.b — Politiques mixtes « administrateur d'agence OU super administrateur »
-- Elles accordaient déjà les droits à l'administrateur de l'agence : cette part
-- est conservée à l'identique. Seule la branche super administrateur, jusqu'ici
-- sans effet, devient opérante.

DROP POLICY IF EXISTS "Users can update their own agency" ON public.agencies;
CREATE POLICY "agencies_update_by_agency_admin"
  ON public.agencies FOR UPDATE TO authenticated
  USING (id = public.current_agency_id() AND public.is_agency_admin())
  WITH CHECK (id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.agency_announcements;
CREATE POLICY "announcements_insert_by_agency_admin"
  ON public.agency_announcements FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can update their agency announcements" ON public.agency_announcements;
CREATE POLICY "announcements_update_by_agency_admin"
  ON public.agency_announcements FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id() AND public.is_agency_admin())
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can delete their agency announcements" ON public.agency_announcements;
CREATE POLICY "announcements_delete_by_agency_admin"
  ON public.agency_announcements FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can insert agency settings" ON public.agency_settings;
CREATE POLICY "agency_settings_insert_by_agency_admin"
  ON public.agency_settings FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can update agency settings" ON public.agency_settings;
CREATE POLICY "agency_settings_update_by_agency_admin"
  ON public.agency_settings FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id() AND public.is_agency_admin())
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can create purchase orders" ON public.purchase_orders;
CREATE POLICY "purchase_orders_insert_by_agency_admin"
  ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can update pending purchase orders" ON public.purchase_orders;
CREATE POLICY "purchase_orders_update_pending_by_agency_admin"
  ON public.purchase_orders FOR UPDATE TO authenticated
  USING (
    status = 'PENDING'
    AND agency_id = public.current_agency_id()
    AND public.is_agency_admin()
  )
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

DROP POLICY IF EXISTS "Admins can update their agency subscription" ON public.subscriptions;
CREATE POLICY "subscriptions_update_by_agency_admin"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id() AND public.is_agency_admin())
  WITH CHECK (agency_id = public.current_agency_id() AND public.is_agency_admin());

-- =============================================================================
-- 5. Garde-fou contre l'élévation de privilèges
-- =============================================================================
-- La politique `users_update_own` autorise un utilisateur à modifier sa propre
-- ligne — c'est nécessaire (nom, téléphone). Mais une politique RLS ne peut pas
-- comparer l'ancienne et la nouvelle valeur d'une colonne : elle ne peut donc pas
-- distinguer « je change mon prénom » de « je me promeus super administrateur ».
-- Un déclencheur le peut.

-- Volontairement en SECURITY INVOKER (le mode par défaut) : la fonction doit
-- pouvoir constater QUI appelle. Dans une fonction SECURITY DEFINER,
-- `current_user` désigne le propriétaire de la fonction et non l'appelant :
-- l'exemption ci-dessous s'appliquerait alors à tout le monde, y compris à
-- l'utilisateur que l'on cherche justement à contrôler.
-- Cette fonction ne lit aucune table : elle n'a besoin d'aucun privilège
-- particulier. Les vérifications de rôle passent par les fonctions d'aide de la
-- section 1, elles-mêmes en SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.guard_user_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Les fonctions serveur (`complete-signup`, `create-admin`,
  -- `update-user-email`, `stripe-webhook`…) utilisent la clé service_role :
  -- elles ne sont pas soumises aux politiques RLS et ne doivent pas l'être à ce
  -- déclencheur non plus, sans quoi la création de compte et l'administration
  -- côté serveur cesseraient de fonctionner. Même chose pour les scripts de
  -- maintenance exécutés directement sur la base (aucune identité applicative).
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Le super administrateur n'est pas concerné : c'est lui qui administre.
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'Le statut de super administrateur ne peut pas être modifié ici.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.agency_id IS DISTINCT FROM OLD.agency_id THEN
    RAISE EXCEPTION 'Le rattachement à une agence ne peut pas être modifié ici.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Rôle et bannissement : réservés à l'administrateur de l'agence.
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR COALESCE(NEW.is_banned, false) IS DISTINCT FROM COALESCE(OLD.is_banned, false))
     AND NOT public.is_agency_admin() THEN
    RAISE EXCEPTION 'Seul un administrateur d''agence peut modifier le rôle ou le bannissement.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Un administrateur ne peut pas se bannir ni se déclasser lui-même :
  -- son agence se retrouverait sans administrateur.
  IF NEW.id = (SELECT auth.uid())
     AND public.is_agency_admin()
     AND (NEW.role IS DISTINCT FROM OLD.role OR COALESCE(NEW.is_banned, false) = true) THEN
    RAISE EXCEPTION 'Un administrateur ne peut pas modifier son propre rôle ni se bannir.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_privileges ON public.users;
CREATE TRIGGER guard_user_privileges
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_privileges();

COMMENT ON FUNCTION public.guard_user_privileges() IS
  'Empêche un utilisateur de modifier son propre statut de super administrateur, '
  'son agence de rattachement, son rôle ou son bannissement.';
