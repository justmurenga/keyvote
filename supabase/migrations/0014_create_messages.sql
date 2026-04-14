-- =============================================
-- Migration: 0014_create_messages
-- Description: Create messaging and SMS campaign tables
-- =============================================

-- Conversations (for in-app messaging)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Participants (candidate to agent)
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Last activity
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    
    -- Unread counts
    candidate_unread_count INTEGER DEFAULT 0,
    agent_unread_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(candidate_id, agent_id)
);

-- Messages (in-app chat messages)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    
    -- Content
    content TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(20), -- 'image', 'video', 'document'
    
    -- Read status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Delivery status
    is_delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Campaigns
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    
    -- Sender ID
    sender_id_name VARCHAR(11), -- Custom sender ID (max 11 chars)
    
    -- Message content
    message TEXT NOT NULL,
    
    -- Targeting
    target_type VARCHAR(20) NOT NULL, -- 'all_followers', 'region', 'demographic'
    target_region_type region_type,
    target_county_id UUID REFERENCES counties(id),
    target_constituency_id UUID REFERENCES constituencies(id),
    target_ward_id UUID REFERENCES wards(id),
    target_gender gender_type,
    target_age_bracket age_bracket,
    
    -- Schedule
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Statistics
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Cost
    cost_per_sms DECIMAL(6, 2) DEFAULT 1.00,
    total_cost DECIMAL(12, 2),
    wallet_transaction_id UUID REFERENCES wallet_transactions(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed', 'cancelled'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Recipients
CREATE TABLE IF NOT EXISTS sms_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    
    phone VARCHAR(15) NOT NULL,
    user_id UUID REFERENCES users(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    
    -- Delivery details
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failure_reason TEXT,
    
    -- Africa's Talking message ID
    at_message_id VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Opt-outs (STOP list)
CREATE TABLE IF NOT EXISTS sms_optouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    opted_out_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

-- WhatsApp campaigns
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    
    -- Template
    template_name VARCHAR(100) NOT NULL,
    template_language VARCHAR(10) DEFAULT 'en',
    template_variables JSONB, -- Variables to fill in template
    
    -- Media (optional)
    media_url TEXT,
    media_type VARCHAR(20),
    
    -- Targeting (same as SMS)
    target_type VARCHAR(20) NOT NULL,
    target_region_type region_type,
    target_county_id UUID REFERENCES counties(id),
    target_constituency_id UUID REFERENCES constituencies(id),
    target_ward_id UUID REFERENCES wards(id),
    
    -- Schedule
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Statistics
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Cost
    cost_per_message DECIMAL(6, 2) DEFAULT 3.00,
    total_cost DECIMAL(12, 2),
    wallet_transaction_id UUID REFERENCES wallet_transactions(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_conversations_candidate ON conversations(candidate_id);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_sms_campaigns_sender ON sms_campaigns(sender_id);
CREATE INDEX idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX idx_sms_campaigns_scheduled ON sms_campaigns(scheduled_at);

CREATE INDEX idx_sms_recipients_campaign ON sms_recipients(campaign_id);
CREATE INDEX idx_sms_recipients_phone ON sms_recipients(phone);
CREATE INDEX idx_sms_recipients_status ON sms_recipients(status);

CREATE INDEX idx_sms_optouts_phone ON sms_optouts(phone);

CREATE INDEX idx_whatsapp_campaigns_sender ON whatsapp_campaigns(sender_id);
CREATE INDEX idx_whatsapp_campaigns_status ON whatsapp_campaigns(status);

-- Trigger to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    -- Update unread count for recipient
    -- (Simplified - would need to know who is recipient)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();

-- Comments
COMMENT ON TABLE conversations IS 'In-app chat conversations between candidates and agents';
COMMENT ON TABLE messages IS 'Individual chat messages';
COMMENT ON TABLE sms_campaigns IS 'Bulk SMS campaigns';
COMMENT ON TABLE sms_recipients IS 'Individual recipients for SMS campaigns';
COMMENT ON TABLE sms_optouts IS 'Phone numbers that opted out of SMS (STOP)';
COMMENT ON TABLE whatsapp_campaigns IS 'Bulk WhatsApp campaigns';
