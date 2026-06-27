ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMPTZ;

UPDATE admins
SET email = 'admin@pefalconsafaris.com'
WHERE username = 'admin' AND email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email
  ON admins (email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admins_password_reset_token
  ON admins (password_reset_token)
  WHERE password_reset_token IS NOT NULL;
