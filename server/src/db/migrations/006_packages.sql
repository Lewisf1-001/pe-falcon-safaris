CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  duration VARCHAR(100) NOT NULL,
  ideal_for VARCHAR(255),
  destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  includes JSONB NOT NULL DEFAULT '[]'::jsonb,
  starting_price_usd INTEGER NOT NULL,
  price_note VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_active_sort ON packages (is_active, sort_order);

INSERT INTO packages (
  slug,
  name,
  duration,
  ideal_for,
  destinations,
  highlights,
  includes,
  starting_price_usd,
  price_note,
  sort_order
)
VALUES
  (
    'masai-mara-classic-safari',
    'Masai Mara Classic Safari',
    '3 Days / 2 Nights',
    'First-time visitors',
    '["Nairobi", "Maasai Mara National Reserve"]'::jsonb,
    '["Big Five game drives", "Great Migration (July–October)", "Maasai cultural village visit", "Sunrise and sunset photography", "Optional hot air balloon safari"]'::jsonb,
    '["2 nights accommodation", "Full-board meals", "Transport in a 4x4 Land Cruiser", "Professional safari guide", "Park entry fees", "Bottled drinking water"]'::jsonb,
    850,
    'mid-range, indicative',
    1
  ),
  (
    'amboseli-elephant-safari',
    'Amboseli Elephant Safari',
    '3 Days / 2 Nights',
    'Couples and photographers',
    '["Amboseli National Park"]'::jsonb,
    '["Large elephant herds", "Mount Kilimanjaro views", "Bird watching", "Morning and evening game drives"]'::jsonb,
    '["Accommodation", "Meals", "Game drives", "Park fees", "Professional guide"]'::jsonb,
    650,
    'indicative',
    2
  )
ON CONFLICT (slug) DO NOTHING;
