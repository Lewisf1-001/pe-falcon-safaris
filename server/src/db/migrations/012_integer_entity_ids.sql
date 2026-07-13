-- Convert users / packages / bookings (and related FKs) from UUID to integer IDs.
-- No-op when users.id is already an integer.

DO $$
DECLARE
  max_user_id INTEGER;
  max_package_id INTEGER;
  max_booking_id INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;
    ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
    ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
    ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_package_id_fkey;

    CREATE TEMP TABLE user_id_map ON COMMIT DROP AS
    SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS new_id
    FROM users;

    CREATE TEMP TABLE package_id_map ON COMMIT DROP AS
    SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY sort_order, created_at, id) AS new_id
    FROM packages;

    CREATE TEMP TABLE booking_id_map ON COMMIT DROP AS
    SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS new_id
    FROM bookings;

    -- users
    ALTER TABLE users ADD COLUMN id_new INTEGER;
    UPDATE users u SET id_new = m.new_id FROM user_id_map m WHERE u.id = m.old_id;
    ALTER TABLE users ALTER COLUMN id_new SET NOT NULL;
    ALTER TABLE users DROP CONSTRAINT users_pkey;
    ALTER TABLE users DROP COLUMN id;
    ALTER TABLE users RENAME COLUMN id_new TO id;
    ALTER TABLE users ADD PRIMARY KEY (id);
    CREATE SEQUENCE IF NOT EXISTS users_id_seq;
    ALTER SEQUENCE users_id_seq OWNED BY users.id;
    SELECT MAX(id) INTO max_user_id FROM users;
    IF max_user_id IS NULL THEN
      PERFORM setval('users_id_seq', 1, false);
    ELSE
      PERFORM setval('users_id_seq', max_user_id);
    END IF;
    ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

    -- packages
    ALTER TABLE packages ADD COLUMN id_new INTEGER;
    UPDATE packages p SET id_new = m.new_id FROM package_id_map m WHERE p.id = m.old_id;
    ALTER TABLE packages ALTER COLUMN id_new SET NOT NULL;
    ALTER TABLE packages DROP CONSTRAINT packages_pkey;
    ALTER TABLE packages DROP COLUMN id;
    ALTER TABLE packages RENAME COLUMN id_new TO id;
    ALTER TABLE packages ADD PRIMARY KEY (id);
    CREATE SEQUENCE IF NOT EXISTS packages_id_seq;
    ALTER SEQUENCE packages_id_seq OWNED BY packages.id;
    SELECT MAX(id) INTO max_package_id FROM packages;
    IF max_package_id IS NULL THEN
      PERFORM setval('packages_id_seq', 1, false);
    ELSE
      PERFORM setval('packages_id_seq', max_package_id);
    END IF;
    ALTER TABLE packages ALTER COLUMN id SET DEFAULT nextval('packages_id_seq');

    -- bookings
    ALTER TABLE bookings ADD COLUMN id_new INTEGER;
    ALTER TABLE bookings ADD COLUMN user_id_new INTEGER;
    ALTER TABLE bookings ADD COLUMN package_id_new INTEGER;

    UPDATE bookings b
    SET
      id_new = bm.new_id,
      user_id_new = um.new_id,
      package_id_new = pm.new_id
    FROM booking_id_map bm, user_id_map um, package_id_map pm
    WHERE b.id = bm.old_id
      AND b.user_id = um.old_id
      AND b.package_id = pm.old_id;

    ALTER TABLE bookings ALTER COLUMN id_new SET NOT NULL;
    ALTER TABLE bookings ALTER COLUMN user_id_new SET NOT NULL;
    ALTER TABLE bookings ALTER COLUMN package_id_new SET NOT NULL;
    ALTER TABLE bookings DROP CONSTRAINT bookings_pkey;
    ALTER TABLE bookings DROP COLUMN id;
    ALTER TABLE bookings DROP COLUMN user_id;
    ALTER TABLE bookings DROP COLUMN package_id;
    ALTER TABLE bookings RENAME COLUMN id_new TO id;
    ALTER TABLE bookings RENAME COLUMN user_id_new TO user_id;
    ALTER TABLE bookings RENAME COLUMN package_id_new TO package_id;
    ALTER TABLE bookings ADD PRIMARY KEY (id);
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_package_id_fkey
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT;
    CREATE SEQUENCE IF NOT EXISTS bookings_id_seq;
    ALTER SEQUENCE bookings_id_seq OWNED BY bookings.id;
    SELECT MAX(id) INTO max_booking_id FROM bookings;
    IF max_booking_id IS NULL THEN
      PERFORM setval('bookings_id_seq', 1, false);
    ELSE
      PERFORM setval('bookings_id_seq', max_booking_id);
    END IF;
    ALTER TABLE bookings ALTER COLUMN id SET DEFAULT nextval('bookings_id_seq');

    CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON bookings (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookings_package ON bookings (package_id);

    -- payments FKs only (payment id stays UUID)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'payments'
    ) THEN
      ALTER TABLE payments ADD COLUMN booking_id_new INTEGER;
      ALTER TABLE payments ADD COLUMN user_id_new INTEGER;

      UPDATE payments p
      SET
        booking_id_new = bm.new_id,
        user_id_new = um.new_id
      FROM booking_id_map bm, user_id_map um
      WHERE p.booking_id = bm.old_id
        AND p.user_id = um.old_id;

      ALTER TABLE payments ALTER COLUMN booking_id_new SET NOT NULL;
      ALTER TABLE payments ALTER COLUMN user_id_new SET NOT NULL;
      ALTER TABLE payments DROP COLUMN booking_id;
      ALTER TABLE payments DROP COLUMN user_id;
      ALTER TABLE payments RENAME COLUMN booking_id_new TO booking_id;
      ALTER TABLE payments RENAME COLUMN user_id_new TO user_id;
      ALTER TABLE payments
        ADD CONSTRAINT payments_booking_id_fkey
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT;
      ALTER TABLE payments
        ADD CONSTRAINT payments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

      CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments (user_id, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_completed_per_booking
        ON payments (booking_id)
        WHERE status = 'completed';
    END IF;
  END IF;
END $$;
