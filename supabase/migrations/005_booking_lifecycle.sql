-- PE Falcon Safaris - Phase 2: Booking Lifecycle States
-- Expands the booking status CHECK constraint to support the full
-- lifecycle: inquiry -> quote -> pending -> confirmed -> completed
-- Plus terminal states: cancelled, expired, refunded
-- And intermediate states: deposit_required, partially_paid, upcoming, in_progress

-- ============================================================
-- 1. EXPAND BOOKING STATUS CHECK CONSTRAINT
-- ============================================================
-- Drop the old constraint and replace with the full lifecycle set.
-- All existing data uses 'pending', 'confirmed', or 'cancelled'
-- which are all included in the new set, so this is safe.

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (status IN (
    'inquiry',        -- Initial: customer submitted request
    'quote',          -- Admin prepared custom quote
    'pending',        -- Awaiting customer payment
    'deposit_required', -- Admin requires deposit before confirmation
    'partially_paid', -- Deposit received, balance due
    'confirmed',      -- Fully paid, reservation confirmed
    'upcoming',       -- Confirmed, travel date approaching
    'in_progress',    -- Safari is underway
    'completed',      -- Safari finished successfully
    'cancelled',      -- Cancelled by customer or admin
    'expired',        -- Quote or payment window expired
    'refunded'        -- Payment refunded
  ));

-- ============================================================
-- 2. ADD INDEX FOR LIFECYCLE QUERIES
-- ============================================================
-- Supports admin dashboard filtering by status groups
-- (e.g. "needs attention" = inquiry, quote, deposit_required, partially_paid)

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings (status)
  WHERE status NOT IN ('completed', 'cancelled', 'refunded');

-- ============================================================
-- 3. ADD NOTES INDEX FOR ADMIN SEARCH
-- ============================================================
-- Admins may search booking notes for special requests

CREATE INDEX IF NOT EXISTS idx_bookings_notes
  ON bookings USING gin (to_tsvector('english', COALESCE(notes, '')))
  WHERE notes IS NOT NULL AND notes != '';
