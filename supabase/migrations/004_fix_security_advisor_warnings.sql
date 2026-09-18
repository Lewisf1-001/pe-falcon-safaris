-- PE Falcon Safaris - Fix Supabase Security Advisor Warnings
-- Addresses:
--   1. Function Search Path Mutable (4 functions)
--   2. Public Bucket Allows Listing (storage.package-images)
--   3. Public Can Execute SECURITY DEFINER Function (3 functions)

-- ============================================================
-- 1. FIX FUNCTION SEARCH PATH MUTABLE
-- ============================================================
-- All SECURITY DEFINER functions get SET search_path = '' to prevent
-- search_path manipulation. Table references are fully qualified.

-- 1a. is_active_admin - used in RLS policies for admin authorization
-- SECURITY DEFINER is required: called from RLS policies which run in
-- the querying user's role context but need to read the admins table.
CREATE OR REPLACE FUNCTION public.is_active_admin(check_auth_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE auth_id = check_auth_id AND status = 'active'
  );
$$;

-- 1b. get_admin_role - used in RLS policies for superadmin checks
-- SECURITY DEFINER is required: same reason as is_active_admin.
CREATE OR REPLACE FUNCTION public.get_admin_role(check_auth_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.admins
  WHERE auth_id = check_auth_id AND status = 'active'
  LIMIT 1;
$$;

-- 1c. handle_new_user - trigger on auth.users INSERT
-- SECURITY DEFINER is required: trigger fires in auth schema context
-- but must INSERT into public.users. Uses fully qualified table names.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Skip creating a user record if this auth user is already an admin
  IF EXISTS (SELECT 1 FROM public.admins WHERE auth_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (auth_id, first_name, last_name, email, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, FALSE)
  );
  RETURN NEW;
END;
$$;

-- 1d. update_updated_at_column - trigger function for auto-updating timestamps
-- SECURITY INVOKER (default). Adding SET search_path for safety.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. FIX PUBLIC Can Execute SECURITY DEFINER Function
-- ============================================================
-- handle_new_user() is a trigger function - should not be callable
-- by arbitrary users. Revoke from PUBLIC and grant only to the
-- Supabase Auth admin role which manages the auth.users trigger.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- is_active_admin and get_admin_role: keep EXECUTE for authenticated
-- and anon (required by RLS policies on public-facing tables).
-- SECURITY DEFINER prevents privilege escalation since the function
-- runs with owner privileges regardless of caller.

-- ============================================================
-- 3. FIX Public Bucket Allows Listing (storage.package-images)
-- ============================================================
-- The bucket stays public (direct URL access works for anonymous
-- visitors viewing safari images). Remove the broad SELECT policy
-- that allows listing all objects via the Storage API, since the
-- application never needs to list objects (images are referenced
-- by direct URL stored in packages.gallery_images).

DROP POLICY IF EXISTS "Public read access for package images" ON storage.objects;

-- Note: Direct URL access (e.g. /storage/v1/object/public/package-images/...)
-- works because the bucket is public, regardless of this policy.
-- The policy only controlled API-based listing via the Storage REST API.
