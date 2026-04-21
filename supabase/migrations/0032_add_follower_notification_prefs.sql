-- ============================================================================
-- Migration: 0032 — Add notification preference columns to followers
-- Description: Adds per-follow notification preferences so voters can opt
--              in/out of SMS and WhatsApp notifications on a per-candidate
--              basis. Fixes runtime error:
--              "column followers.sms_notifications does not exist"
-- ============================================================================

ALTER TABLE followers
    ADD COLUMN IF NOT EXISTS sms_notifications      BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS whatsapp_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS email_notifications    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS push_notifications     BOOLEAN NOT NULL DEFAULT TRUE;

-- Helpful index when filtering followers by who wants SMS notifications
CREATE INDEX IF NOT EXISTS idx_followers_sms_optin
    ON followers(candidate_id)
    WHERE is_following = TRUE AND sms_notifications = TRUE;

CREATE INDEX IF NOT EXISTS idx_followers_whatsapp_optin
    ON followers(candidate_id)
    WHERE is_following = TRUE AND whatsapp_notifications = TRUE;

COMMENT ON COLUMN followers.sms_notifications      IS 'Whether voter wants SMS notifications from this candidate';
COMMENT ON COLUMN followers.whatsapp_notifications IS 'Whether voter wants WhatsApp notifications from this candidate';
COMMENT ON COLUMN followers.email_notifications    IS 'Whether voter wants email notifications from this candidate';
COMMENT ON COLUMN followers.push_notifications     IS 'Whether voter wants in-app push notifications from this candidate';
