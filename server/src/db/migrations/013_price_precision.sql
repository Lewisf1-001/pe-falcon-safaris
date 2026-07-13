-- Store USD equivalents with enough precision so package-currency × guests converts cleanly.
ALTER TABLE packages
  ALTER COLUMN starting_price_usd TYPE NUMERIC(18, 8)
  USING starting_price_usd::NUMERIC(18, 8);

ALTER TABLE bookings
  ALTER COLUMN total_price_usd TYPE NUMERIC(18, 8)
  USING total_price_usd::NUMERIC(18, 8);

ALTER TABLE payments
  ALTER COLUMN amount_usd TYPE NUMERIC(18, 8)
  USING amount_usd::NUMERIC(18, 8);

-- Recompute package USD from the stored package-currency price (default FX rates).
UPDATE packages
SET starting_price_usd = ROUND(
  CASE upper(COALESCE(price_currency, 'USD'))
    WHEN 'KES' THEN starting_price / 129.0
    WHEN 'EUR' THEN starting_price / 0.92
    WHEN 'GBP' THEN starting_price / 0.79
    ELSE starting_price
  END,
  8
);
