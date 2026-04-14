-- =============================================
-- Migration: 0011_create_polls
-- Description: Create polls and poll_votes tables
-- =============================================

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Electoral position this poll is for
    position electoral_position NOT NULL,
    
    -- Scope (regional restriction for the poll)
    -- NULL values = national scope for that position
    county_id UUID REFERENCES counties(id),
    constituency_id UUID REFERENCES constituencies(id),
    ward_id UUID REFERENCES wards(id),
    
    -- Schedule
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Poll type
    is_party_nomination BOOLEAN DEFAULT FALSE,
    party_id UUID REFERENCES political_parties(id), -- If nomination poll
    
    -- Status
    status poll_status DEFAULT 'scheduled',
    
    -- Statistics (updated via triggers)
    total_votes INTEGER DEFAULT 0,
    
    -- Administration
    created_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure end_time is after start_time
    CONSTRAINT chk_poll_times CHECK (end_time > start_time),
    
    -- If nomination poll, party must be set
    CONSTRAINT chk_nomination_party CHECK (
        (is_party_nomination = TRUE AND party_id IS NOT NULL) OR
        (is_party_nomination = FALSE)
    )
);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Voter's location snapshot (for regional analytics, vote is anonymous)
    polling_station_id UUID REFERENCES polling_stations(id),
    ward_id UUID REFERENCES wards(id),
    constituency_id UUID REFERENCES constituencies(id),
    county_id UUID REFERENCES counties(id),
    
    -- Demographics (for analytics, not linked to specific vote)
    voter_gender gender_type,
    voter_age_bracket age_bracket,
    
    -- Vote metadata
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    vote_source VARCHAR(20) DEFAULT 'web', -- 'web', 'android', 'ussd'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One vote per voter per poll
    UNIQUE(poll_id, voter_id)
);

-- Create indexes
CREATE INDEX idx_polls_position ON polls(position);
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_start_time ON polls(start_time);
CREATE INDEX idx_polls_end_time ON polls(end_time);
CREATE INDEX idx_polls_county ON polls(county_id);
CREATE INDEX idx_polls_constituency ON polls(constituency_id);
CREATE INDEX idx_polls_ward ON polls(ward_id);
CREATE INDEX idx_polls_party ON polls(party_id);

CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_voter ON poll_votes(voter_id);
CREATE INDEX idx_poll_votes_candidate ON poll_votes(candidate_id);
CREATE INDEX idx_poll_votes_polling_station ON poll_votes(polling_station_id);
CREATE INDEX idx_poll_votes_ward ON poll_votes(ward_id);
CREATE INDEX idx_poll_votes_constituency ON poll_votes(constituency_id);
CREATE INDEX idx_poll_votes_county ON poll_votes(county_id);
CREATE INDEX idx_poll_votes_voted_at ON poll_votes(voted_at);

-- Compound indexes for result queries
CREATE INDEX idx_poll_votes_poll_candidate ON poll_votes(poll_id, candidate_id);
CREATE INDEX idx_poll_votes_poll_county ON poll_votes(poll_id, county_id);
CREATE INDEX idx_poll_votes_poll_gender ON poll_votes(poll_id, voter_gender);

-- Function to capture voter info on poll vote
CREATE OR REPLACE FUNCTION capture_poll_vote_demographics()
RETURNS TRIGGER AS $$
BEGIN
    SELECT 
        u.polling_station_id,
        u.ward_id,
        u.constituency_id,
        u.county_id,
        u.gender,
        u.age_bracket
    INTO 
        NEW.polling_station_id,
        NEW.ward_id,
        NEW.constituency_id,
        NEW.county_id,
        NEW.voter_gender,
        NEW.voter_age_bracket
    FROM users u
    WHERE u.id = NEW.voter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_capture_poll_vote_demographics
    BEFORE INSERT ON poll_votes
    FOR EACH ROW
    EXECUTE FUNCTION capture_poll_vote_demographics();

-- Function to update poll vote count
CREATE OR REPLACE FUNCTION update_poll_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE polls
    SET total_votes = (
        SELECT COUNT(*) FROM poll_votes WHERE poll_id = NEW.poll_id
    ),
    updated_at = NOW()
    WHERE id = NEW.poll_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_poll_vote_count
    AFTER INSERT ON poll_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_vote_count();

-- Function to auto-update poll status based on time
CREATE OR REPLACE FUNCTION update_poll_status()
RETURNS void AS $$
BEGIN
    -- Activate scheduled polls that should start
    UPDATE polls
    SET status = 'active', updated_at = NOW()
    WHERE status = 'scheduled' 
    AND start_time <= NOW() 
    AND end_time > NOW();
    
    -- Complete active polls that have ended
    UPDATE polls
    SET status = 'completed', updated_at = NOW()
    WHERE status = 'active' 
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE polls IS 'Opinion polls scheduled by position';
COMMENT ON COLUMN polls.position IS 'Electoral position: president, governor, senator, women_rep, mp, mca';
COMMENT ON TABLE poll_votes IS 'Individual poll votes (one per voter per poll)';
COMMENT ON COLUMN poll_votes.vote_source IS 'Platform where vote was cast: web, android, ussd';
