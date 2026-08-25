-- PE Falcon Safaris - Supabase Storage Setup
-- Run this in the Supabase SQL Editor after schema.sql

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('package-images', 'package-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Public read access for package images
CREATE POLICY "Public read access for package images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'package-images');

-- Authenticated upload for admins
CREATE POLICY "Admins can upload package images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'package-images'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE auth_id = auth.uid() AND status = 'active'
    )
  );

-- Admins can update package images
CREATE POLICY "Admins can update package images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'package-images'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE auth_id = auth.uid() AND status = 'active'
    )
  );

-- Admins can delete package images
CREATE POLICY "Admins can delete package images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'package-images'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE auth_id = auth.uid() AND status = 'active'
    )
  );
