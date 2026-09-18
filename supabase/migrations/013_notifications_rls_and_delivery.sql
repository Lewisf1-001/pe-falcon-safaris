-- Phase 15 Tier 1: Notification RLS hardening
-- Additive migration: replaces insecure INSERT policy with service-role-only.

-- ============================================================
-- HARDEN NOTIFICATION INSERT POLICY
-- ============================================================
-- The previous INSERT policy used WITH CHECK (TRUE), which allowed any
-- authenticated user to insert notifications for arbitrary user_ids
-- by bypassing the Edge Function and calling Supabase directly.
--
-- This restricts inserts to the service_role only, matching how the
-- notifications Edge Function actually operates (using the service-role
-- key for inserts). The Edge Function already validates callers as
-- service-role or admin before creating notifications.
--
-- Existing callers (bookings, mpesa Edge Functions) already use the
-- service-role key in the Authorization header when calling the
-- notifications Edge Function, so they will continue to work.

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
