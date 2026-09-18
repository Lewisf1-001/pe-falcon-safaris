-- PE Falcon Safaris - Phase 4: Quotation System
-- Adds quotations and quotation_items tables for the admin-to-customer
-- quotation workflow. Server-calculated totals, strict RLS.

-- ============================================================
-- 1. QUOTATIONS TABLE
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
-- 2. QUOTATION ITEMS TABLE
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
-- 3. AUTO-CALCULATE ITEM AMOUNT TRIGGER
-- ============================================================
-- Ensures amount_usd = quantity * unit_price_usd at the database level.
-- Prevents client-side price manipulation.

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

-- ============================================================
-- 4. AUTO-CALCULATE QUOTATION TOTALS TRIGGER
-- ============================================================
-- When quotation_items change, recalculate the quotation subtotal/total.
-- subtotal = sum of non-discount items
-- discount = sum of discount items
-- total = subtotal - discount + tax

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
  -- Determine which quotation to update
  IF TG_TABLE_NAME = 'quotation_items' THEN
    IF TG_OP = 'DELETE' THEN
      v_quotation_id := OLD.quotation_id;
    ELSE
      v_quotation_id := NEW.quotation_id;
    END IF;
  ELSE:
    v_quotation_id := NEW.id;
  END IF;

  -- Calculate from items
  SELECT
    COALESCE(SUM(CASE WHEN category != 'discount' THEN amount_usd ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'discount' THEN ABS(amount_usd) ELSE 0 END), 0)
  INTO v_subtotal, v_discount
  FROM public.quotation_items
  WHERE quotation_id = v_quotation_id;

  -- Update the quotation totals
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
-- 5. UPDATE QUOTATIONS UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE TRIGGER quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Customers can view their own quotations
CREATE POLICY "Users can view own quotations"
  ON public.quotations FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Customers can view items of their own quotations
CREATE POLICY "Users can view own quotation items"
  ON public.quotation_items FOR SELECT
  USING (quotation_id IN (
    SELECT id FROM public.quotations
    WHERE user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  ));

-- Admins can view all quotations
CREATE POLICY "Admins can view all quotations"
  ON public.quotations FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can view all quotation items
CREATE POLICY "Admins can view all quotation items"
  ON public.quotation_items FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can manage quotations (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage quotations"
  ON public.quotations FOR ALL
  USING (public.is_active_admin(auth.uid()));

-- Admins can manage quotation items
CREATE POLICY "Admins can manage quotation items"
  ON public.quotation_items FOR ALL
  USING (public.is_active_admin(auth.uid()));
