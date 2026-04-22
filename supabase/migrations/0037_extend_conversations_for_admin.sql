-- =============================================
-- Migration: 0037_extend_conversations_for_admin
-- Description: Extend the conversations / messages model so that admins
--              can also start and reply to in-app conversations with any
--              user (candidates, agents, voters). Backwards compatible
--              with the existing candidate <-> agent flow.
-- =============================================

-- 1. Relax NOT NULL on legacy participant columns so non-candidate/agent
--    conversations can exist (e.g. admin <-> any user).
ALTER TABLE conversations ALTER COLUMN candidate_id DROP NOT NULL;
ALTER TABLE conversations ALTER COLUMN agent_id     DROP NOT NULL;

-- 2. Drop the old hard UNIQUE constraint and replace with a partial
--    unique index that only applies to candidate-agent conversations.
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_candidate_id_agent_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversations_candidate_agent
    ON conversations (candidate_id, agent_id)
    WHERE candidate_id IS NOT NULL AND agent_id IS NOT NULL;

-- 3. New columns
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS conversation_type   VARCHAR(30) NOT NULL DEFAULT 'candidate_agent',
    ADD COLUMN IF NOT EXISTS subject             TEXT,
    -- Per-side unread counters for non-candidate/agent conversations.
    ADD COLUMN IF NOT EXISTS initiator_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS recipient_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS initiator_unread_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS recipient_unread_count INTEGER DEFAULT 0;

-- 4. Sanity check: known conversation types.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conversations_type_check'
    ) THEN
        ALTER TABLE conversations
            ADD CONSTRAINT conversations_type_check
            CHECK (conversation_type IN ('candidate_agent', 'admin_user', 'support'));
    END IF;
END $$;

-- 5. Make sure either the legacy pair OR the new pair is populated.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conversations_participants_check'
    ) THEN
        ALTER TABLE conversations
            ADD CONSTRAINT conversations_participants_check
            CHECK (
                (candidate_id IS NOT NULL AND agent_id IS NOT NULL)
                OR (initiator_user_id IS NOT NULL AND recipient_user_id IS NOT NULL)
            );
    END IF;
END $$;

-- 6. Partial unique index on (initiator, recipient) for non-candidate-agent
--    conversations so we don't create duplicates when admin re-opens chat.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversations_admin_user
    ON conversations (LEAST(initiator_user_id, recipient_user_id),
                      GREATEST(initiator_user_id, recipient_user_id),
                      conversation_type)
    WHERE conversation_type <> 'candidate_agent';

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_initiator ON conversations(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_recipient ON conversations(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type      ON conversations(conversation_type);

-- 8. Update trigger to also bump unread counters for admin_user conversations.
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    conv RECORD;
BEGIN
    SELECT * INTO conv FROM conversations WHERE id = NEW.conversation_id;

    UPDATE conversations
    SET
        last_message_at      = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 140),
        updated_at           = NOW()
    WHERE id = NEW.conversation_id;

    IF conv.conversation_type = 'candidate_agent' THEN
        -- Determine recipient by sender role.
        IF EXISTS (SELECT 1 FROM candidates c WHERE c.id = conv.candidate_id AND c.user_id = NEW.sender_id) THEN
            UPDATE conversations SET agent_unread_count = COALESCE(agent_unread_count, 0) + 1
            WHERE id = NEW.conversation_id;
        ELSIF EXISTS (SELECT 1 FROM agents a WHERE a.id = conv.agent_id AND a.user_id = NEW.sender_id) THEN
            UPDATE conversations SET candidate_unread_count = COALESCE(candidate_unread_count, 0) + 1
            WHERE id = NEW.conversation_id;
        END IF;
    ELSE
        IF NEW.sender_id = conv.initiator_user_id THEN
            UPDATE conversations SET recipient_unread_count = COALESCE(recipient_unread_count, 0) + 1
            WHERE id = NEW.conversation_id;
        ELSIF NEW.sender_id = conv.recipient_user_id THEN
            UPDATE conversations SET initiator_unread_count = COALESCE(initiator_unread_count, 0) + 1
            WHERE id = NEW.conversation_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Comments
COMMENT ON COLUMN conversations.conversation_type   IS 'candidate_agent | admin_user | support';
COMMENT ON COLUMN conversations.subject             IS 'Optional subject line (used for admin_user / support threads)';
COMMENT ON COLUMN conversations.initiator_user_id   IS 'For non candidate-agent conversations: the user that started the thread';
COMMENT ON COLUMN conversations.recipient_user_id   IS 'For non candidate-agent conversations: the other participant';
