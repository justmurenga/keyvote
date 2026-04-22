-- =============================================
-- Migration: 0036_poll_notifications_on_initiate
-- Description: Add tracking table and function to send notifications 
--              when admin initiates (publishes) a poll to region users
-- Idempotent: safe to re-run.
-- =============================================

-- ============ POLL NOTIFICATION TRACKING TABLE ============
-- Tracks which users have been notified about a specific poll being initiated/published
-- This prevents duplicate notifications and helps audit notification history
CREATE TABLE IF NOT EXISTS poll_notifications_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    notification_type VARCHAR(30) DEFAULT 'poll_initiated', -- 'poll_initiated', 'poll_scheduled', etc.
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, user_id, notification_type)
);

CREATE INDEX idx_poll_notifications_sent_poll ON poll_notifications_sent(poll_id);
CREATE INDEX idx_poll_notifications_sent_user ON poll_notifications_sent(user_id);
CREATE INDEX idx_poll_notifications_sent_sent_at ON poll_notifications_sent(sent_at);

-- ============ FUNCTION TO SEND POLL INITIATION NOTIFICATIONS ============
-- Called when a poll is created/activated to notify users in that region
-- Matches users' location (county/constituency/ward) to poll's scope
CREATE OR REPLACE FUNCTION send_poll_initiation_notifications(
    p_poll_id UUID,
    p_notification_type VARCHAR DEFAULT 'poll_initiated'
)
RETURNS TABLE (
    notified_count BIGINT,
    notification_ids UUID[]
) AS $$
DECLARE
    v_poll polls%ROWTYPE;
    v_user_count BIGINT;
    v_notification_ids UUID[];
BEGIN
    -- Get poll details
    SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
    IF v_poll IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, ARRAY[]::UUID[];
        RETURN;
    END IF;

    -- Only notify if poll is scheduled or active
    IF v_poll.status NOT IN ('scheduled', 'active') THEN
        RETURN QUERY SELECT 0::BIGINT, ARRAY[]::UUID[];
        RETURN;
    END IF;

    -- Find and notify users in the poll's geographic scope
    -- If poll has regional restrictions (county/constituency/ward), target those users
    -- Otherwise, target all verified voters nationwide
    WITH target_users AS (
        SELECT u.id, u.full_name, u.ward_id, u.constituency_id, u.county_id
        FROM users u
        WHERE u.is_active = TRUE
          AND u.is_verified = TRUE
          AND (
              -- National scope: notify all verified users
              (v_poll.county_id IS NULL AND v_poll.constituency_id IS NULL AND v_poll.ward_id IS NULL)
              -- County scope: only users in that county
              OR (v_poll.county_id IS NOT NULL AND u.county_id = v_poll.county_id)
              -- Constituency scope: only users in that constituency
              OR (v_poll.constituency_id IS NOT NULL AND u.constituency_id = v_poll.constituency_id)
              -- Ward scope: only users in that ward
              OR (v_poll.ward_id IS NOT NULL AND u.ward_id = v_poll.ward_id)
          )
          -- Exclude users already notified about this poll
          AND NOT EXISTS (
              SELECT 1 FROM poll_notifications_sent
              WHERE poll_id = p_poll_id
                AND user_id = u.id
                AND notification_type = p_notification_type
          )
    ),
    create_notifications AS (
        INSERT INTO notifications (
            user_id,
            type,
            title,
            body,
            action_url,
            action_label,
            metadata,
            is_read
        )
        SELECT
            tu.id,
            'poll_initiated',
            'New Poll: ' || v_poll.title,
            'A new poll on ' || v_poll.position || 
            CASE 
                WHEN v_poll.ward_id IS NOT NULL THEN ' in your ward'
                WHEN v_poll.constituency_id IS NOT NULL THEN ' in your constituency'
                WHEN v_poll.county_id IS NOT NULL THEN ' in your county'
                ELSE ' nationwide'
            END || ' is now open. Tap to vote!',
            '/polls',
            'Vote Now',
            jsonb_build_object(
                'poll_id', v_poll.id,
                'position', v_poll.position,
                'region_level', 
                CASE 
                    WHEN v_poll.ward_id IS NOT NULL THEN 'ward'
                    WHEN v_poll.constituency_id IS NOT NULL THEN 'constituency'
                    WHEN v_poll.county_id IS NOT NULL THEN 'county'
                    ELSE 'national'
                END
            ),
            FALSE
        FROM target_users tu
        RETURNING id
    )
    -- Track that we've sent notifications and return the count
    INSERT INTO poll_notifications_sent (poll_id, user_id, notification_id, notification_type)
    SELECT 
        p_poll_id,
        tu.id,
        cn.id,
        p_notification_type
    FROM target_users tu
    JOIN create_notifications cn ON tu.id = (SELECT user_id FROM notifications WHERE id = cn.id)
    ON CONFLICT (poll_id, user_id, notification_type) DO NOTHING;

    -- Get notification count
    SELECT COUNT(*) INTO v_user_count FROM poll_notifications_sent 
    WHERE poll_id = p_poll_id AND notification_type = p_notification_type;

    RETURN QUERY SELECT v_user_count, ARRAY(
        SELECT notification_id FROM poll_notifications_sent 
        WHERE poll_id = p_poll_id AND notification_type = p_notification_type
        LIMIT 100
    )::UUID[];
END;
$$ LANGUAGE plpgsql;

-- ============ TRIGGER TO AUTO-NOTIFY ON POLL STATUS CHANGE ============
-- Automatically send notifications when poll transitions to 'scheduled' or 'active'
CREATE OR REPLACE FUNCTION trigger_poll_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- If poll is being set to 'active' or 'scheduled' from another status, send notifications
    IF (NEW.status IN ('active', 'scheduled') AND OLD.status IS DISTINCT FROM NEW.status)
       OR (OLD IS NULL AND NEW.status IN ('active', 'scheduled')) THEN
        PERFORM send_poll_initiation_notifications(NEW.id, 'poll_initiated');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS tr_poll_notifications ON polls;

-- Create trigger on polls table
CREATE TRIGGER tr_poll_notifications
    AFTER INSERT OR UPDATE OF status ON polls
    FOR EACH ROW
    EXECUTE FUNCTION trigger_poll_notifications();

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_notifications_poll_metadata ON notifications 
    USING GIN (metadata) WHERE type = 'poll_initiated';

COMMENT ON TABLE poll_notifications_sent IS 'Tracks poll initiation notifications sent to users to prevent duplicates';
COMMENT ON FUNCTION send_poll_initiation_notifications(UUID, VARCHAR) IS 'Sends in-app notifications to all verified users in a polls geographic scope when poll is initiated';
COMMENT ON FUNCTION trigger_poll_notifications() IS 'Automatically triggers notification sending when poll status changes to active or scheduled';
