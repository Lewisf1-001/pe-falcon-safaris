-- Add superadmin role to admins table
-- This migration adds a role column and updates the existing admin user to superadmin.

-- ============================================================
-- ADD ROLE COLUMN TO ADMINS TABLE
-- ============================================================
ALTER TABLE admins ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'superadmin'));

-- Set the existing admin user to superadmin
UPDATE admins SET role = 'superadmin' WHERE email = 'makosabisho@gmail.com';

-- ============================================================
-- UPDATE IS_ACTIVE_ADMIN FUNCTION
-- ============================================================
-- The function now returns the role for use in RLS policies
CREATE OR REPLACE FUNCTION public.get_admin_role(check_auth_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role FROM admins
  WHERE auth_id = check_auth_id AND status = 'active'
  LIMIT 1;
$$;

-- Keep is_active_admin for backward compatibility
CREATE OR REPLACE FUNCTION public.is_active_admin(check_auth_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE auth_id = check_auth_id AND status = 'active'
  );
$$;

-- ============================================================
-- UPDATE RLS POLICIES FOR SUPERADMIN
-- ============================================================

-- Drop the overly-permissive admin policy (any active admin could manage other admins)
DROP POLICY IF EXISTS "Admins can manage admins" ON admins;

-- Superadmin can manage other admins (create, update, delete)
CREATE POLICY "Superadmins can manage admins"
  ON admins FOR ALL
  USING (
    public.get_admin_role(auth.uid()) = 'superadmin'
  );

-- Any active admin can view admins (for listing)
DROP POLICY IF EXISTS "Admins can view admins" ON admins;
CREATE POLICY "Admins can view admins"
  ON admins FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO authenticated;

-- ============================================================
-- UPDATE HANDLE_NEW_USER TRIGGER
-- ============================================================
-- Skip creating a user record if the auth user is already an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
