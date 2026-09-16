-- PE Falcon Safaris - Supabase Schema
-- Canonical schema representation — aligned with migrations 001-004.
-- Run this in the Supabase SQL Editor for fresh environments.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- Note: Supabase Auth handles auth.users. This is our custom
-- users table for additional profile data linked via user_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMINS TABLE
-- Admins use Supabase Auth with an "admin" metadata claim.
-- role column added in migration 003.
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited')),
  invite_token VARCHAR(255),
  invite_token_expires_at TIMESTAMPTZ,
  role VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email
  ON admins (email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admins_invite_token
  ON admins (invite_token)
  WHERE invite_token IS NOT NULL;

-- ============================================================
-- PACKAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  duration VARCHAR(100) NOT NULL,
  ideal_for VARCHAR(255),
  destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  includes JSONB NOT NULL DEFAULT '[]'::jsonb,
  starting_price NUMERIC(12, 2) NOT NULL,
  starting_price_usd NUMERIC(18, 8) NOT NULL,
  price_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  price_note VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_active_sort ON packages (is_active, sort_order);

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  travel_date DATE NOT NULL,
  guests INTEGER NOT NULL CHECK (guests >= 1 AND guests <= 20),
  total_price_usd NUMERIC(18, 8) NOT NULL CHECK (total_price_usd >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'inquiry', 'quote', 'pending', 'deposit_required', 'partially_paid',
      'confirmed', 'upcoming', 'in_progress', 'completed',
      'cancelled', 'expired', 'refunded'
    )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_created
  ON bookings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created
  ON bookings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_package
  ON bookings (package_id);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_usd NUMERIC(18, 8) NOT NULL CHECK (amount_usd > 0),
  method VARCHAR(20) NOT NULL CHECK (method IN ('mobile_money', 'card')),
  provider VARCHAR(40),
  phone VARCHAR(20),
  card_last4 VARCHAR(4),
  card_brand VARCHAR(20),
  cardholder_name VARCHAR(120),
  external_ref VARCHAR(255),
  mpesa_checkout_request_id VARCHAR(100),
  mpesa_merchant_request_id VARCHAR(100),
  mpesa_receipt_number VARCHAR(100),
  client_receipt_sent_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking
  ON payments (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user_created
  ON payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_mpesa_checkout
  ON payments (mpesa_checkout_request_id)
  WHERE mpesa_checkout_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_completed_per_booking
  ON payments (booking_id)
  WHERE status = 'completed';

-- ============================================================
-- QUOTATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  travel_date DATE NOT NULL,
  guests INTEGER NOT NULL CHECK (guests >= 1 AND guests <= 20),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal_usd NUMERIC(18, 8) NOT NULL CHECK (subtotal_usd >= 0),
  discount_usd NUMERIC(18, 8) NOT NULL DEFAULT 0 CHECK (discount_usd >= 0),
  tax_usd NUMERIC(18, 8) NOT NULL DEFAULT 0 CHECK (tax_usd >= 0),
  total_usd NUMERIC(18, 8) NOT NULL CHECK (total_usd >= 0),
  valid_until DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled')),
  notes_customer TEXT,
  notes_admin TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_user_id
  ON quotations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_status
  ON quotations (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_booking_id
  ON quotations (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_valid_until
  ON quotations (valid_until)
  WHERE status IN ('draft', 'sent', 'viewed');

-- ============================================================
-- QUOTATION ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS quotation_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price_usd NUMERIC(18, 8) NOT NULL CHECK (unit_price_usd >= 0),
  amount_usd NUMERIC(18, 8) NOT NULL CHECK (amount_usd >= 0),
  category VARCHAR(50) NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'accommodation', 'transport', 'park_fees', 'activities',
      'meals', 'guide', 'other', 'discount'
    )),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id
  ON quotation_items (quotation_id, sort_order);

-- ============================================================
-- DESTINATIONS TABLE (Phase 7)
-- ============================================================
CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  country VARCHAR(100),
  region VARCHAR(100),
  short_description TEXT,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  hero_image TEXT,
  gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title VARCHAR(255),
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destinations_slug
  ON destinations (slug);

CREATE INDEX IF NOT EXISTS idx_destinations_status
  ON destinations (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_destinations_featured
  ON destinations (featured)
  WHERE featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_destinations_status_featured
  ON destinations (status, featured, sort_order);

-- ============================================================
-- PACKAGE_DESTINATIONS JUNCTION TABLE (Phase 7)
-- ============================================================
CREATE TABLE IF NOT EXISTS package_destinations (
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (package_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_package_destinations_destination
  ON package_destinations (destination_id);

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================================
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

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QUOTATION ITEM AMOUNT AUTO-CALCULATION
CREATE OR REPLACE FUNCTION public.calculate_quotation_item_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.amount_usd = NEW.quantity * NEW.unit_price_usd;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER quotation_item_amount_calc
  BEFORE INSERT OR UPDATE ON public.quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_quotation_item_amount();

-- QUOTATION TOTALS AUTO-CALCULATION
CREATE OR REPLACE FUNCTION public.calculate_quotation_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_subtotal NUMERIC(18, 8);
  v_discount NUMERIC(18, 8);
  v_quotation_id INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_quotation_id := OLD.quotation_id;
  ELSE
    v_quotation_id := NEW.quotation_id;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN category != 'discount' THEN amount_usd ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'discount' THEN ABS(amount_usd) ELSE 0 END), 0)
  INTO v_subtotal, v_discount
  FROM public.quotation_items
  WHERE quotation_id = v_quotation_id;

  UPDATE public.quotations
  SET subtotal_usd = v_subtotal,
      discount_usd = v_discount,
      total_usd = v_subtotal - v_discount + tax_usd,
      updated_at = NOW()
  WHERE id = v_quotation_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER quotation_totals_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_quotation_totals();

-- ============================================================
-- ADMIN AUTHORIZATION FUNCTIONS (migrations 002, 003, 004)
-- ============================================================

-- Check if a given auth user is an active admin.
-- SECURITY DEFINER required: called from RLS policies that run in
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

-- Return the role of an active admin (or NULL if not an admin).
-- Used by superadmin-only RLS policies.
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

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
-- Skips creating a user record if the auth user is already an admin.
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

-- Trigger to auto-create user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Revoke public execute on SECURITY DEFINER functions (migration 004)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Grant execute on RLS helper functions (migration 003)
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO authenticated;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can update users
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (
    public.is_active_admin(auth.uid())
  );

-- ADMINS POLICIES
-- Admins can view other admins
CREATE POLICY "Admins can view admins"
  ON admins FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Superadmins can manage other admins (invite, update, delete)
CREATE POLICY "Superadmins can manage admins"
  ON admins FOR ALL
  USING (
    public.get_admin_role(auth.uid()) = 'superadmin'
  );

-- PACKAGES POLICIES
-- Everyone can view active packages (public)
CREATE POLICY "Public can view active packages"
  ON packages FOR SELECT
  USING (is_active = TRUE);

-- Admins can view all packages
CREATE POLICY "Admins can view all packages"
  ON packages FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can manage packages
CREATE POLICY "Admins can manage packages"
  ON packages FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- BOOKINGS POLICIES
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can create bookings
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can manage bookings
CREATE POLICY "Admins can manage bookings"
  ON bookings FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- PAYMENTS POLICIES
-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can create payments
CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can manage payments
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- QUOTATIONS POLICIES
-- Enable RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own quotations
CREATE POLICY "Users can view own quotations"
  ON quotations FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Users can view items of their own quotations
CREATE POLICY "Users can view own quotation items"
  ON quotation_items FOR SELECT
  USING (
    quotation_id IN (
      SELECT id FROM quotations
      WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Admins can view all quotations
CREATE POLICY "Admins can view all quotations"
  ON quotations FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can view all quotation items
CREATE POLICY "Admins can view all quotation items"
  ON quotation_items FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can manage quotations
CREATE POLICY "Admins can manage quotations"
  ON quotations FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can manage quotation items
CREATE POLICY "Admins can manage quotation items"
  ON quotation_items FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- DESTINATIONS POLICIES
-- Public can view published destinations
CREATE POLICY "Public can view published destinations"
  ON destinations FOR SELECT
  USING (status = 'published');

-- Admins can view all destinations
CREATE POLICY "Admins can view all destinations"
  ON destinations FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can manage destinations
CREATE POLICY "Admins can manage destinations"
  ON destinations FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- PACKAGE_DESTINATIONS POLICIES
-- Public can view package_destinations for published destinations
CREATE POLICY "Public can view package destinations"
  ON package_destinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = package_destinations.destination_id
      AND destinations.status = 'published'
    )
  );

-- Admins can view all package_destinations
CREATE POLICY "Admins can view all package destinations"
  ON package_destinations FOR SELECT
  USING (
    public.is_active_admin(auth.uid())
  );

-- Admins can manage package_destinations
CREATE POLICY "Admins can manage package destinations"
  ON package_destinations FOR ALL
  USING (
    public.is_active_admin(auth.uid())
  );

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed default packages
INSERT INTO packages (
  slug,
  name,
  duration,
  ideal_for,
  destinations,
  highlights,
  includes,
  starting_price,
  starting_price_usd,
  price_currency,
  price_note,
  sort_order
)
VALUES
  (
    'masai-mara-classic-safari',
    'Masai Mara Classic Safari',
    '3 Days / 2 Nights',
    'First-time visitors',
    '["Nairobi", "Maasai Mara National Reserve"]'::jsonb,
    '["Big Five game drives", "Great Migration (July–October)", "Maasai cultural village visit", "Sunrise and sunset photography", "Optional hot air balloon safari"]'::jsonb,
    '["2 nights accommodation", "Full-board meals", "Transport in a 4x4 Land Cruiser", "Professional safari guide", "Park entry fees", "Bottled drinking water"]'::jsonb,
    850,
    850,
    'USD',
    'mid-range, indicative',
    1
  ),
  (
    'amboseli-elephant-safari',
    'Amboseli Elephant Safari',
    '3 Days / 2 Nights',
    'Couples and photographers',
    '["Amboseli National Park"]'::jsonb,
    '["Large elephant herds", "Mount Kilimanjaro views", "Bird watching", "Morning and evening game drives"]'::jsonb,
    '["Accommodation", "Meals", "Game drives", "Park fees", "Professional guide"]'::jsonb,
    650,
    650,
    'USD',
    'indicative',
    2
  )
ON CONFLICT (slug) DO NOTHING;
