-- Phase 8: Wildlife Explorer
-- Additive migration: wildlife_species table + destination_wildlife junction table.
-- Existing tables, data, and relationships are NOT modified.

-- ============================================================
-- WILDLIFE_SPECIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS wildlife_species (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  scientific_name VARCHAR(255),
  common_name VARCHAR(255),
  short_description TEXT,
  description TEXT,
  habitat TEXT,
  behavior TEXT,
  diet TEXT,
  conservation_status VARCHAR(50)
    CHECK (conservation_status IN (
      'least_concern', 'near_threatened', 'vulnerable',
      'endangered', 'critically_endangered', 'data_deficient', 'not_evaluated'
    )),
  safari_viewing TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  hero_image TEXT,
  gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title VARCHAR(255),
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wildlife_species_slug
  ON wildlife_species (slug);

CREATE INDEX IF NOT EXISTS idx_wildlife_species_status
  ON wildlife_species (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wildlife_species_featured
  ON wildlife_species (featured)
  WHERE featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_wildlife_species_status_featured
  ON wildlife_species (status, featured, sort_order);

CREATE INDEX IF NOT EXISTS idx_wildlife_species_conservation
  ON wildlife_species (conservation_status);

-- ============================================================
-- DESTINATION_WILDLIFE JUNCTION TABLE
-- Many-to-many: one destination can feature multiple species,
-- one species can appear in multiple destinations.
-- ============================================================
CREATE TABLE IF NOT EXISTS destination_wildlife (
  destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  species_id INTEGER NOT NULL REFERENCES wildlife_species(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (destination_id, species_id)
);

CREATE INDEX IF NOT EXISTS idx_destination_wildlife_species
  ON destination_wildlife (species_id);

-- ============================================================
-- UPDATED_AT TRIGGER FOR WILDLIFE_SPECIES
-- ============================================================
CREATE TRIGGER update_wildlife_species_updated_at
  BEFORE UPDATE ON wildlife_species
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE wildlife_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_wildlife ENABLE ROW LEVEL SECURITY;

-- Public can view published species
CREATE POLICY "Public can view published wildlife"
  ON wildlife_species FOR SELECT
  USING (status = 'published');

-- Admins can view all species
CREATE POLICY "Admins can view all wildlife"
  ON wildlife_species FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can manage all species
CREATE POLICY "Admins can manage wildlife"
  ON wildlife_species FOR ALL
  USING (public.is_active_admin(auth.uid()));

-- Public can view destination_wildlife for published destinations
CREATE POLICY "Public can view destination wildlife"
  ON destination_wildlife FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = destination_wildlife.destination_id
      AND destinations.status = 'published'
    )
  );

-- Admins can view all destination_wildlife
CREATE POLICY "Admins can view all destination wildlife"
  ON destination_wildlife FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can manage destination_wildlife
CREATE POLICY "Admins can manage destination wildlife"
  ON destination_wildlife FOR ALL
  USING (public.is_active_admin(auth.uid()));
