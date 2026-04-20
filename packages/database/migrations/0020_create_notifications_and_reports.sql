-- =============================================
-- Migration: 0020_create_notifications_and_reports
-- Description: Notifications, agent reports, and SMS sender IDs
-- Fully idempotent: safe to re-run
-- =============================================

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    action_label TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist (handles partial prior runs)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ============ AGENT REPORTS ============
CREATE TABLE IF NOT EXISTS agent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES users(id),
    report_type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    photos JSONB DEFAULT '[]',
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_name TEXT,
    people_reached INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist (handles partial prior runs)
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS people_reached INTEGER DEFAULT 0;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS activity_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE agent_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============ SMS SENDER IDS ============
CREATE TABLE IF NOT EXISTS sms_sender_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    sender_id VARCHAR(11) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    cost_per_sms DECIMAL(6, 2) DEFAULT 1.00,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id, sender_id)
);

-- Ensure all columns exist (handles partial prior runs)
ALTER TABLE sms_sender_ids ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE sms_sender_ids ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE sms_sender_ids ADD COLUMN IF NOT EXISTS cost_per_sms DECIMAL(6, 2) DEFAULT 1.00;
ALTER TABLE sms_sender_ids ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE sms_sender_ids ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE sms_sender_ids ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_agent_reports_agent ON agent_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reports_status ON agent_reports(status);
CREATE INDEX IF NOT EXISTS idx_agent_reports_date ON agent_reports(activity_date);

CREATE INDEX IF NOT EXISTS idx_sms_sender_ids_candidate ON sms_sender_ids(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sms_sender_ids_active ON sms_sender_ids(is_active, is_approved);

-- ============ COMMENTS ============
COMMENT ON TABLE notifications IS 'User notifications for all event types';
COMMENT ON TABLE agent_reports IS 'Daily activity reports submitted by campaign agents';
COMMENT ON TABLE sms_sender_ids IS 'Admin-assigned SMS sender IDs for candidates';
