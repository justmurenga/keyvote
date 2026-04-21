-- =============================================
-- Migration: 0029_notifications_rls_and_realtime
-- Description: Allow users to view & update their own notifications,
--              enable realtime broadcast for in-app alerts (mobile + web).
-- Idempotent: safe to re-run.
-- =============================================

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read (update is_read / read_at)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role / system_admin (server-side via admin client) bypasses RLS,
-- so no INSERT policy is needed for clients (notifications are server-created).

-- ============================================================================
-- Realtime: ensure the notifications table is broadcast on the supabase_realtime
-- publication so mobile/web clients receive INSERT events live.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- ALTER PUBLICATION ... ADD TABLE will fail if table is already in the
    -- publication, so guard against that.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    END IF;
  END IF;
END $$;

COMMENT ON POLICY "Users can view own notifications" ON notifications
  IS 'Each user sees only the notifications addressed to them.';
