-- =============================================
-- Migration: 0035_create_follow_invites
-- Description: Logs SMS invitations sent by voters to friends inviting them
--              to follow a candidate. One row per recipient per send.
-- =============================================

CREATE TABLE IF NOT EXISTS follow_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    message_id TEXT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_invites_inviter
    ON follow_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_follow_invites_candidate
    ON follow_invites(candidate_id);
CREATE INDEX IF NOT EXISTS idx_follow_invites_phone
    ON follow_invites(phone);

ALTER TABLE follow_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follow_invites_owner_select ON follow_invites;
CREATE POLICY follow_invites_owner_select
    ON follow_invites FOR SELECT
    USING (inviter_id = auth.uid());

DROP POLICY IF EXISTS follow_invites_admin_all ON follow_invites;
CREATE POLICY follow_invites_admin_all
    ON follow_invites FOR ALL
    USING (is_system_admin(auth.uid()))
    WITH CHECK (is_system_admin(auth.uid()));

COMMENT ON TABLE follow_invites IS
    'Audit trail of voter-initiated SMS invitations to follow a candidate.';
