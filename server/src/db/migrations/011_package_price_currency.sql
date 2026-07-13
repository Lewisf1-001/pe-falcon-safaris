-- Store package prices in the currency admins enter; keep USD equivalent for bookings/payments.
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS starting_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) NOT NULL DEFAULT 'USD';

UPDATE packages
SET starting_price = starting_price_usd
WHERE starting_price IS NULL;

ALTER TABLE packages
  ALTER COLUMN starting_price SET NOT NULL;

ALTER TABLE packages
  ALTER COLUMN starting_price_usd TYPE NUMERIC(12, 2)
  USING starting_price_usd::NUMERIC(12, 2);

ALTER TABLE bookings
  ALTER COLUMN total_price_usd TYPE NUMERIC(12, 2)
  USING total_price_usd::NUMERIC(12, 2);

ALTER TABLE payments
  ALTER COLUMN amount_usd TYPE NUMERIC(12, 2)
  USING amount_usd::NUMERIC(12, 2);
