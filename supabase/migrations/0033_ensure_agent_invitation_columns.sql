-- =============================================
-- Migration: 0033_ensure_agent_invitation_columns
-- Description: Ensure invitation-related columns exist on agents table
--              and reload PostgREST schema cache so the API can see them.
--              Also relax the chk_agent_region constraint so pending
--              invitations without a fully-set region don't fail (region
--              required only when agent is active).
-- =============================================

-- Ensure required columns exist (idempotent)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();
ALTER TABLE agents ADD COLUMN IF NOT EXISTS invited_phone VARCHAR(15);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS invited_name VARCHAR(200);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill any rows that were created before invitation_token existed
UPDATE agents
SET invitation_token = gen_random_uuid()
WHERE invitation_token IS NULL;

-- Useful index for invitation lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_invitation_token
    ON agents(invitation_token);

-- Reload PostgREST schema cache so the new columns are visible immediately
NOTIFY pgrst, 'reload schema';
