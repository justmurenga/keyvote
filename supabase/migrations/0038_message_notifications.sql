-- =============================================
-- Migration: 0038_message_notifications
-- Description: Create an in-app notification row for each message that is
--              sent in a conversation. Recipient gets a notification with
--              a deep link to /dashboard/messages so the bell + bell badge
--              light up immediately.
-- =============================================

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    conv RECORD;
    recipient_user_id UUID;
    sender_name TEXT;
    preview TEXT;
BEGIN
    SELECT * INTO conv FROM conversations WHERE id = NEW.conversation_id;
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Resolve recipient user id depending on the conversation type.
    IF conv.conversation_type = 'candidate_agent' THEN
        IF EXISTS (SELECT 1 FROM candidates c WHERE c.id = conv.candidate_id AND c.user_id = NEW.sender_id) THEN
            SELECT user_id INTO recipient_user_id FROM agents WHERE id = conv.agent_id;
        ELSIF EXISTS (SELECT 1 FROM agents a WHERE a.id = conv.agent_id AND a.user_id = NEW.sender_id) THEN
            SELECT user_id INTO recipient_user_id FROM candidates WHERE id = conv.candidate_id;
        END IF;
    ELSE
        IF NEW.sender_id = conv.initiator_user_id THEN
            recipient_user_id := conv.recipient_user_id;
        ELSIF NEW.sender_id = conv.recipient_user_id THEN
            recipient_user_id := conv.initiator_user_id;
        END IF;
    END IF;

    IF recipient_user_id IS NULL OR recipient_user_id = NEW.sender_id THEN
        RETURN NEW;
    END IF;

    SELECT full_name INTO sender_name FROM users WHERE id = NEW.sender_id;
    preview := LEFT(COALESCE(NEW.content, ''), 140);

    INSERT INTO notifications (user_id, type, title, body, action_url, action_label, metadata)
    VALUES (
        recipient_user_id,
        'message',
        COALESCE('New message from ' || sender_name, 'New message'),
        preview,
        '/dashboard/messages?conversation=' || NEW.conversation_id::text,
        'Open conversation',
        jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'sender_id', NEW.sender_id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_on_new_message ON messages;
CREATE TRIGGER tr_notify_on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_new_message();

COMMENT ON FUNCTION notify_on_new_message IS 'Creates an in-app notification for the message recipient.';
