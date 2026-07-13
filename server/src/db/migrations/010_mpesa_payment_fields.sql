ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mpesa_merchant_request_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_payments_mpesa_checkout
  ON payments (mpesa_checkout_request_id)
  WHERE mpesa_checkout_request_id IS NOT NULL;
