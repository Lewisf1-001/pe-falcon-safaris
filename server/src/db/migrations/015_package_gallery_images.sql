ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE packages
SET gallery_images = '[
  {"url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80", "alt": "Safari vehicle on the golden plains of Maasai Mara at sunrise"},
  {"url": "https://images.unsplash.com/photo-1523805005666-112b9547a472?auto=format&fit=crop&w=1200&q=80", "alt": "Male lion resting in tall grass during a Maasai Mara game drive"},
  {"url": "https://images.unsplash.com/photo-1564760055775-bfe68e91c2bd?auto=format&fit=crop&w=1200&q=80", "alt": "Wildebeest herd crossing the savanna during the Great Migration"},
  {"url": "https://images.unsplash.com/photo-1535083783855-77577a8ddb8f?auto=format&fit=crop&w=1200&q=80", "alt": "Acacia trees and open grasslands at sunset in Maasai Mara"}
]'::jsonb
WHERE slug = 'masai-mara-classic-safari';

UPDATE packages
SET gallery_images = '[
  {"url": "https://images.unsplash.com/photo-1549366021-9f79d501e5d2?auto=format&fit=crop&w=1200&q=80", "alt": "Elephants walking across Amboseli with Mount Kilimanjaro in the distance"},
  {"url": "https://images.unsplash.com/photo-1557050543-4d2fbea4f0c8?auto=format&fit=crop&w=1200&q=80", "alt": "Large elephant herd gathered near a watering hole in Amboseli"},
  {"url": "https://images.unsplash.com/photo-1547970813-1cc44bd6d352?auto=format&fit=crop&w=1200&q=80", "alt": "Close-up of an African elephant in Amboseli National Park"},
  {"url": "https://images.unsplash.com/photo-1504177847862-768b07f28a39?auto=format&fit=crop&w=1200&q=80", "alt": "Wide savanna landscape with wildlife in southern Kenya"}
]'::jsonb
WHERE slug = 'amboseli-elephant-safari';

UPDATE packages
SET gallery_images = '[
  {"url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80", "alt": "Game drive through Kenya''s national parks on the Explorer Safari route"},
  {"url": "https://images.unsplash.com/photo-1516939884455-1445c8652f83?auto=format&fit=crop&w=1200&q=80", "alt": "Flamingos gathered along the shoreline of Lake Nakuru"},
  {"url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80", "alt": "Calm waters of Lake Naivasha surrounded by acacia woodland"},
  {"url": "https://images.unsplash.com/photo-1523805005666-112b9547a472?auto=format&fit=crop&w=1200&q=80", "alt": "Big cat sighting during a game drive in Maasai Mara"}
]'::jsonb
WHERE slug = 'kenya-explorer-safari';

UPDATE packages
SET gallery_images = '[
  {"url": "https://images.unsplash.com/photo-1549366021-9f79d501e5d2?auto=format&fit=crop&w=1200&q=80", "alt": "Elephants beneath Mount Kilimanjaro at Amboseli on the Signature Safari"},
  {"url": "https://images.unsplash.com/photo-1516939884455-1445c8652f83?auto=format&fit=crop&w=1200&q=80", "alt": "Pink flamingos on Lake Nakuru during the Kenya Signature Safari"},
  {"url": "https://images.unsplash.com/photo-1564760055775-bfe68e91c2bd?auto=format&fit=crop&w=1200&q=80", "alt": "Vast herds on the Maasai Mara plains during a luxury game drive"},
  {"url": "https://images.unsplash.com/photo-1473496161614-6559e130424a?auto=format&fit=crop&w=1200&q=80", "alt": "Luxury tented camp set among the Kenyan bush at dusk"}
]'::jsonb
WHERE slug = 'kenya-signature-safari';

UPDATE packages
SET gallery_images = '[
  {"url": "https://images.unsplash.com/photo-1547970813-1cc44bd6d352?auto=format&fit=crop&w=1200&q=80", "alt": "Red-dusted elephants characteristic of Tsavo National Park"},
  {"url": "https://images.unsplash.com/photo-1504177847862-768b07f28a39?auto=format&fit=crop&w=1200&q=80", "alt": "Dramatic volcanic landscapes and open bush in Tsavo East"},
  {"url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80", "alt": "Safari vehicle exploring the rugged terrain of Tsavo"},
  {"url": "https://images.unsplash.com/photo-1535083783855-77577a8ddb8f?auto=format&fit=crop&w=1200&q=80", "alt": "Golden sunset over the Tsavo wilderness"}
]'::jsonb
WHERE slug = 'tsavo-adventure-safari';

UPDATE packages
SET gallery_images = '[
  {"url": "https://images.unsplash.com/photo-1473496161614-6559e130424a?auto=format&fit=crop&w=1200&q=80", "alt": "Romantic luxury safari tent overlooking the Maasai Mara bush"},
  {"url": "https://images.unsplash.com/photo-1523805005666-112b9547a472?auto=format&fit=crop&w=1200&q=80", "alt": "Wildlife encounter during a private honeymoon game drive"},
  {"url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", "alt": "Turquoise waters and white sand at Diani Beach"},
  {"url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80", "alt": "Serene coastal lagoon near the Kenyan shoreline"}
]'::jsonb
WHERE slug = 'honeymoon-safari-beach-escape';
