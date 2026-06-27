CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2b$12$oUDr2JNhW.lHf53DX5aLDuiIClWdWED97F/CsVjZN6nPTc2IJHM12')
ON CONFLICT (username) DO NOTHING;
