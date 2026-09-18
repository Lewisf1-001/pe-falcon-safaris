-- PE Falcon Safaris - Supabase Storage Setup
-- Run this in the Supabase SQL Editor after schema.sql
-- Aligned with migration 004: public listing policy removed.

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('package-images', 'package-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Note: The bucket is public (direct URL access works for anonymous
-- visitors viewing safari images). No public SELECT/listing policy
-- is created — images are referenced by direct URL stored in
-- packages.gallery_images.

-- Authenticated upload for admins
CREATE POLICY "Admins can upload package images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'package-images'
    AND public.is_active_admin(auth.uid())
  );

-- Admins can update package images
CREATE POLICY "Admins can update package images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'package-images'
    AND public.is_active_admin(auth.uid())
  );

-- Admins can delete package images
CREATE POLICY "Admins can delete package images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'package-images'
    AND public.is_active_admin(auth.uid())
  );
