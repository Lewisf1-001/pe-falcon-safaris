ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS client_receipt_sent_at TIMESTAMPTZ;
