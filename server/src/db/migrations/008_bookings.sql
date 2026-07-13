CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  travel_date DATE NOT NULL,
  guests INTEGER NOT NULL CHECK (guests >= 1 AND guests <= 20),
  total_price_usd INTEGER NOT NULL CHECK (total_price_usd >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
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
