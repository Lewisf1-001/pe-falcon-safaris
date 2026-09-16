-- Phase 7: Destination CMS
-- Additive migration: destinations table + package_destinations junction table.
-- Existing tables, data, and relationships are NOT modified.

-- ============================================================
-- DESTINATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS destinations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  country VARCHAR(100),
  region VARCHAR(100),
  short_description TEXT,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  hero_image TEXT,
  gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destinations_slug
  ON destinations (slug);

CREATE INDEX IF NOT EXISTS idx_destinations_status
  ON destinations (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_destinations_featured
  ON destinations (featured)
  WHERE featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_destinations_status_featured
  ON destinations (status, featured, sort_order);

ALTER TABLE destinations ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- PACKAGE_DESTINATIONS JUNCTION TABLE
-- Many-to-many: one package can belong to multiple destinations,
-- one destination can have multiple packages.
-- ============================================================
CREATE TABLE IF NOT EXISTS package_destinations (
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (package_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_package_destinations_destination
  ON package_destinations (destination_id);

-- ============================================================
-- UPDATED_AT TRIGGER FOR DESTINATIONS
-- ============================================================
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_destinations ENABLE ROW LEVEL SECURITY;

-- Public can view published destinations
CREATE POLICY "Public can view published destinations"
  ON destinations FOR SELECT
  USING (status = 'published');

-- Admins can view all destinations
CREATE POLICY "Admins can view all destinations"
  ON destinations FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can manage all destinations
CREATE POLICY "Admins can manage destinations"
  ON destinations FOR ALL
  USING (public.is_active_admin(auth.uid()));

-- Public can view package_destinations for published destinations
CREATE POLICY "Public can view package destinations"
  ON package_destinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = package_destinations.destination_id
      AND destinations.status = 'published'
    )
  );

-- Admins can view all package_destinations
CREATE POLICY "Admins can view all package destinations"
  ON package_destinations FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can manage package_destinations
CREATE POLICY "Admins can manage package destinations"
  ON package_destinations FOR ALL
  USING (public.is_active_admin(auth.uid()));
