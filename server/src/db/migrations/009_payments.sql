CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_usd INTEGER NOT NULL CHECK (amount_usd > 0),
  method VARCHAR(20) NOT NULL CHECK (method IN ('mobile_money', 'card')),
  provider VARCHAR(40),
  phone VARCHAR(20),
  card_last4 VARCHAR(4),
  card_brand VARCHAR(20),
  cardholder_name VARCHAR(120),
  external_ref VARCHAR(255),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_completed_per_booking
  ON payments (booking_id)
  WHERE status = 'completed';
