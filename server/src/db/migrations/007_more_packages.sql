-- Keep re-seed inserts valid if price columns were added by later migrations.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'packages' AND column_name = 'starting_price'
  ) THEN
    ALTER TABLE packages ALTER COLUMN starting_price SET DEFAULT 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'packages' AND column_name = 'price_currency'
  ) THEN
    ALTER TABLE packages ALTER COLUMN price_currency SET DEFAULT 'USD';
  END IF;
END $$;

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
    'kenya-explorer-safari',
    'Kenya Explorer Safari',
    '5 Days / 4 Nights',
    NULL,
    '["Lake Nakuru National Park", "Lake Naivasha", "Hell''s Gate National Park", "Maasai Mara National Reserve"]'::jsonb,
    '["Rhino sanctuary", "Flamingos", "Boat ride on Lake Naivasha", "Cycling at Hell''s Gate", "Big Five safari in Maasai Mara"]'::jsonb,
    '["Accommodation", "Meals", "Park fees", "Transport", "Safari guide"]'::jsonb,
    1250,
    'indicative',
    3
  ),
  (
    'kenya-signature-safari',
    'Kenya Signature Safari',
    '7 Days / 6 Nights',
    NULL,
    '["Amboseli National Park", "Lake Naivasha", "Lake Nakuru National Park", "Maasai Mara National Reserve"]'::jsonb,
    '["Big Five", "Mount Kilimanjaro", "Boat safari", "Crescent Island walk", "Maasai cultural experience", "Luxury tented camps"]'::jsonb,
    '["Luxury accommodation", "Full-board meals", "Park fees", "Private Land Cruiser", "English-speaking guide", "Airport transfers"]'::jsonb,
    2000,
    '2,000–2,500 per person, indicative',
    4
  ),
  (
    'tsavo-adventure-safari',
    'Tsavo Adventure Safari',
    '4 Days / 3 Nights',
    NULL,
    '["Tsavo East National Park", "Tsavo West National Park"]'::jsonb,
    '["Red elephants", "Mzima Springs", "Lions and leopards", "Lava fields", "Scenic landscapes"]'::jsonb,
    '["Accommodation", "Meals", "Park fees", "Transport", "Safari guide"]'::jsonb,
    950,
    'indicative',
    5
  ),
  (
    'honeymoon-safari-beach-escape',
    'Honeymoon Safari & Beach Escape',
    '8 Days / 7 Nights',
    'Honeymooners and anniversary celebrations',
    '["Maasai Mara National Reserve", "Diani Beach"]'::jsonb,
    '["Luxury safari", "Romantic bush dinner", "Beach relaxation", "Optional snorkeling and diving", "Sunset cruise"]'::jsonb,
    '["Luxury accommodation", "Full-board meals", "Park fees", "Transport", "Safari guide", "Beach resort stay"]'::jsonb,
    3200,
    'indicative, custom quotes available',
    6
  )
ON CONFLICT (slug) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'packages' AND column_name = 'starting_price'
  ) THEN
    EXECUTE $sql$
      UPDATE packages
      SET starting_price = starting_price_usd
      WHERE starting_price IS NULL OR starting_price = 0
    $sql$;
  END IF;
END $$;

