-- =============================================
-- Migration: 0010_create_agents
-- Description: Create agents and agent_reports tables
-- =============================================

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Assignment region
    assigned_region_type region_type NOT NULL,
    -- The specific region ID (polling_station, ward, constituency, or county)
    assigned_polling_station_id UUID REFERENCES polling_stations(id),
    assigned_ward_id UUID REFERENCES wards(id),
    assigned_constituency_id UUID REFERENCES constituencies(id),
    assigned_county_id UUID REFERENCES counties(id),
    
    -- Payment info
    mpesa_number VARCHAR(15),
    
    -- Status tracking
    status agent_status DEFAULT 'pending',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    
    -- Performance metrics (updated via triggers)
    total_reports INTEGER DEFAULT 0,
    total_results_submitted INTEGER DEFAULT 0,
    total_payments_received DECIMAL(12, 2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One agent per user per candidate
    UNIQUE(user_id, candidate_id),
    
    -- Ensure region matches type
    CONSTRAINT chk_agent_region CHECK (
        (assigned_region_type = 'polling_station' AND assigned_polling_station_id IS NOT NULL) OR
        (assigned_region_type = 'ward' AND assigned_ward_id IS NOT NULL) OR
        (assigned_region_type = 'constituency' AND assigned_constituency_id IS NOT NULL) OR
        (assigned_region_type = 'county' AND assigned_county_id IS NOT NULL) OR
        (assigned_region_type = 'national')
    )
);

-- Agent reports table
CREATE TABLE IF NOT EXISTS agent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Report type
    report_type VARCHAR(50) NOT NULL, -- 'rally', 'door_to_door', 'meeting', 'observation', etc.
    title VARCHAR(200),
    content TEXT NOT NULL,
    
    -- Media attachments
    media_urls TEXT[], -- Array of image/video URLs
    
    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(200),
    
    -- Status
    status VARCHAR(20) DEFAULT 'submitted', -- 'submitted', 'reviewed', 'approved', 'rejected'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_agents_candidate ON agents(candidate_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_polling_station ON agents(assigned_polling_station_id);
CREATE INDEX idx_agents_ward ON agents(assigned_ward_id);
CREATE INDEX idx_agents_constituency ON agents(assigned_constituency_id);
CREATE INDEX idx_agents_county ON agents(assigned_county_id);

CREATE INDEX idx_agent_reports_agent ON agent_reports(agent_id);
CREATE INDEX idx_agent_reports_type ON agent_reports(report_type);
CREATE INDEX idx_agent_reports_status ON agent_reports(status);
CREATE INDEX idx_agent_reports_reported_at ON agent_reports(reported_at);

-- Update user role when agent is created
CREATE OR REPLACE FUNCTION update_user_role_to_agent()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if user is currently a voter
    UPDATE users 
    SET role = 'agent', updated_at = NOW()
    WHERE id = NEW.user_id AND role = 'voter';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_user_role_agent
    AFTER INSERT ON agents
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION update_user_role_to_agent();

-- Update agent report count
CREATE OR REPLACE FUNCTION update_agent_report_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agents
    SET total_reports = (
        SELECT COUNT(*) FROM agent_reports WHERE agent_id = NEW.agent_id
    ),
    updated_at = NOW()
    WHERE id = NEW.agent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_agent_report_count
    AFTER INSERT ON agent_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_report_count();

-- Comments
COMMENT ON TABLE agents IS 'Campaign agents assigned by candidates';
COMMENT ON COLUMN agents.assigned_region_type IS 'Level of region assignment: polling_station, ward, constituency, county, or national';
COMMENT ON TABLE agent_reports IS 'Activity reports submitted by agents';
