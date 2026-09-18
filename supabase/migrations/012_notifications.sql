-- Phase 15: Notifications
-- Additive migration: notifications + notification_deliveries tables.
-- Existing tables, data, and relationships are NOT modified.

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- ============================================================
-- NOTIFICATION_DELIVERIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('in_app', 'email', 'whatsapp')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  provider_reference TEXT,
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_reference
  ON notifications (reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
  ON notification_deliveries (notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON notification_deliveries (channel, status);

-- Idempotency: prevent duplicate notifications for same event
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
  ON notifications (user_id, type, reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Service role can insert notifications (Edge Functions use service role)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Admins can view all deliveries
CREATE POLICY "Admins can view all deliveries"
  ON notification_deliveries FOR SELECT
  USING (public.is_active_admin(auth.uid()));

-- Service role can manage deliveries
CREATE POLICY "Service role can manage deliveries"
  ON notification_deliveries FOR ALL
  WITH CHECK (TRUE);
