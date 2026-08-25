UPDATE packages
SET gallery_images = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'url',
        regexp_replace(image->>'url', '^https?://[^/]+', ''),
        'alt',
        image->>'alt'
      )
    )
    FROM jsonb_array_elements(gallery_images) AS image
  ),
  '[]'::jsonb
),
updated_at = NOW()
WHERE jsonb_array_length(gallery_images) > 0;
