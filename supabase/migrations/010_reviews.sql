-- Phase 13: Reviews & Testimonials
-- Additive migration: reviews table.
-- Existing tables, data, and relationships are NOT modified.

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  admin_response TEXT,
  admin_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id
  ON reviews (booking_id);

CREATE INDEX IF NOT EXISTS idx_reviews_status
  ON reviews (status);

CREATE INDEX IF NOT EXISTS idx_reviews_package_id
  ON reviews (package_id)
  WHERE package_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_created_at
  ON reviews (created_at DESC);

-- One review per booking per user (where booking is provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_booking
  ON reviews (booking_id, user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public can view approved reviews only
CREATE POLICY "Public can view approved reviews"
  ON reviews FOR SELECT
  USING (status = 'approved');

-- Users can view their own reviews (all statuses)
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can create reviews (ownership enforced via RLS + Edge Function)
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can update their own pending reviews
CREATE POLICY "Users can update own pending reviews"
  ON reviews FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
  USING (public.is_active_admin(auth.uid()));
