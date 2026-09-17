-- Phase 9: Destination Geographic Coordinates
-- Additive migration: latitude and longitude columns for the Interactive Safari Map.
-- Existing tables, data, and relationships are NOT modified.

-- ============================================================
-- DESTINATIONS TABLE — ADD COORDINATE COLUMNS
-- ============================================================
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- ============================================================
-- DATABASE-LEVEL VALIDATION CONSTRAINTS
-- ============================================================
ALTER TABLE destinations
  ADD CONSTRAINT chk_destinations_latitude_range
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE destinations
  ADD CONSTRAINT chk_destinations_longitude_range
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
