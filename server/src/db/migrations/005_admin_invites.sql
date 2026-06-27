ALTER TABLE admins
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invite_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ;

UPDATE admins
SET status = 'active'
WHERE password_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admins_invite_token
  ON admins (invite_token)
  WHERE invite_token IS NOT NULL;
