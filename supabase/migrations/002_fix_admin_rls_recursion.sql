-- Fix infinite recursion in admins RLS policies
-- The admins table policies reference themselves, causing infinite recursion.
-- Solution: Create a security definer function to check admin status.

-- Drop the self-referencing policies on admins
DROP POLICY IF EXISTS "Admins can view admins" ON admins;
DROP POLICY IF EXISTS "Admins can manage admins" ON admins;

-- Create a security definer function to check if a user is an active admin
CREATE OR REPLACE FUNCTION public.is_active_admin(check_auth_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE auth_id = check_auth_id AND status = 'active'
  );
$$;

-- Recreate admins policies using the security definer function
CREATE POLICY "Admins can view admins"
  ON admins FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

CREATE POLICY "Admins can manage admins"
  ON admins FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- Update all other admin-checking policies to use the function
-- (This prevents potential future recursion issues)

-- USERS policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (
    public.is_active_admin(auth.uid())
  );

-- PACKAGES policies
DROP POLICY IF EXISTS "Admins can view all packages" ON packages;
DROP POLICY IF EXISTS "Admins can manage packages" ON packages;

CREATE POLICY "Admins can view all packages"
  ON packages FOR SELECT
  USING (
    is_active_admin(auth.uid())
  );

CREATE POLICY "Admins can manage packages"
  ON packages FOR ALL
  USING (
    is_active_admin(auth.uid())
  );

-- BOOKINGS policies
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
    is_active_admin(auth.uid())
  );

CREATE POLICY "Admins can manage bookings"
  ON bookings FOR ALL
  USING (
    is_active_admin(auth.uid())
  );

-- PAYMENTS policies
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    is_active_admin(auth.uid())
  );

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    is_active_admin(auth.uid())
  );
