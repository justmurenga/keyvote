-- =============================================
-- Migration: 0012_create_election_results
-- Description: Create election results tables
-- =============================================

-- Election result submissions (raw submissions from agents)
CREATE TABLE IF NOT EXISTS election_result_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID NOT NULL REFERENCES polling_stations(id) ON DELETE CASCADE,
    position electoral_position NOT NULL,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    votes INTEGER NOT NULL CHECK (votes >= 0),
    
    -- Submission details
    submitted_by UUID REFERENCES users(id), -- Agent or admin
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Location verification
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Result sheet image
    result_sheet_url TEXT,
    
    -- Source of submission
    submission_source VARCHAR(20) DEFAULT 'android', -- 'android', 'web', 'ussd'
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consolidated election results (calculated using MODE)
CREATE TABLE IF NOT EXISTS election_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID NOT NULL REFERENCES polling_stations(id) ON DELETE CASCADE,
    position electoral_position NOT NULL,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Final votes (MODE of submissions)
    votes INTEGER NOT NULL,
    
    -- Metadata
    submission_count INTEGER DEFAULT 1, -- How many submissions contributed
    has_discrepancy BOOLEAN DEFAULT FALSE, -- True if submissions had different values
    discrepancy_range INTEGER, -- Max - Min of submitted values
    
    -- Best result sheet
    result_sheet_url TEXT,
    
    -- Denormalized location for faster aggregation
    ward_id UUID REFERENCES wards(id),
    constituency_id UUID REFERENCES constituencies(id),
    county_id UUID REFERENCES counties(id),
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One result per station-position-candidate
    UNIQUE(polling_station_id, position, candidate_id)
);

-- Result sheets gallery (multiple images per polling station)
CREATE TABLE IF NOT EXISTS result_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID NOT NULL REFERENCES polling_stations(id) ON DELETE CASCADE,
    position electoral_position NOT NULL,
    
    -- Image details
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Upload info
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_result_submissions_station ON election_result_submissions(polling_station_id);
CREATE INDEX idx_result_submissions_position ON election_result_submissions(position);
CREATE INDEX idx_result_submissions_candidate ON election_result_submissions(candidate_id);
CREATE INDEX idx_result_submissions_submitted_by ON election_result_submissions(submitted_by);
CREATE INDEX idx_result_submissions_submitted_at ON election_result_submissions(submitted_at);

CREATE INDEX idx_election_results_station ON election_results(polling_station_id);
CREATE INDEX idx_election_results_position ON election_results(position);
CREATE INDEX idx_election_results_candidate ON election_results(candidate_id);
CREATE INDEX idx_election_results_ward ON election_results(ward_id);
CREATE INDEX idx_election_results_constituency ON election_results(constituency_id);
CREATE INDEX idx_election_results_county ON election_results(county_id);

CREATE INDEX idx_result_sheets_station ON result_sheets(polling_station_id);
CREATE INDEX idx_result_sheets_position ON result_sheets(position);

-- Compound indexes for common queries
CREATE INDEX idx_election_results_position_county ON election_results(position, county_id);
CREATE INDEX idx_election_results_position_constituency ON election_results(position, constituency_id);
CREATE INDEX idx_election_results_position_ward ON election_results(position, ward_id);

-- Trigger to populate location fields on election_results
CREATE OR REPLACE FUNCTION populate_result_location()
RETURNS TRIGGER AS $$
BEGIN
    SELECT 
        ps.ward_id,
        w.constituency_id,
        c.county_id
    INTO 
        NEW.ward_id,
        NEW.constituency_id,
        NEW.county_id
    FROM polling_stations ps
    JOIN wards w ON ps.ward_id = w.id
    JOIN constituencies c ON w.constituency_id = c.id
    WHERE ps.id = NEW.polling_station_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_populate_result_location
    BEFORE INSERT ON election_results
    FOR EACH ROW
    EXECUTE FUNCTION populate_result_location();

-- Function to calculate MODE and update consolidated results
CREATE OR REPLACE FUNCTION calculate_result_mode(
    p_polling_station_id UUID,
    p_position electoral_position,
    p_candidate_id UUID
)
RETURNS void AS $$
DECLARE
    v_mode_votes INTEGER;
    v_submission_count INTEGER;
    v_min_votes INTEGER;
    v_max_votes INTEGER;
    v_result_sheet TEXT;
BEGIN
    -- Calculate MODE (most frequent value)
    SELECT votes, COUNT(*) as freq
    INTO v_mode_votes
    FROM election_result_submissions
    WHERE polling_station_id = p_polling_station_id
    AND position = p_position
    AND candidate_id = p_candidate_id
    GROUP BY votes
    ORDER BY freq DESC, votes DESC
    LIMIT 1;
    
    -- Get submission stats
    SELECT 
        COUNT(*),
        MIN(votes),
        MAX(votes)
    INTO 
        v_submission_count,
        v_min_votes,
        v_max_votes
    FROM election_result_submissions
    WHERE polling_station_id = p_polling_station_id
    AND position = p_position
    AND candidate_id = p_candidate_id;
    
    -- Get most recent verified result sheet
    SELECT result_sheet_url
    INTO v_result_sheet
    FROM election_result_submissions
    WHERE polling_station_id = p_polling_station_id
    AND position = p_position
    AND candidate_id = p_candidate_id
    AND result_sheet_url IS NOT NULL
    ORDER BY submitted_at DESC
    LIMIT 1;
    
    -- Upsert consolidated result
    INSERT INTO election_results (
        polling_station_id,
        position,
        candidate_id,
        votes,
        submission_count,
        has_discrepancy,
        discrepancy_range,
        result_sheet_url,
        last_updated
    ) VALUES (
        p_polling_station_id,
        p_position,
        p_candidate_id,
        v_mode_votes,
        v_submission_count,
        v_min_votes != v_max_votes,
        v_max_votes - v_min_votes,
        v_result_sheet,
        NOW()
    )
    ON CONFLICT (polling_station_id, position, candidate_id)
    DO UPDATE SET
        votes = EXCLUDED.votes,
        submission_count = EXCLUDED.submission_count,
        has_discrepancy = EXCLUDED.has_discrepancy,
        discrepancy_range = EXCLUDED.discrepancy_range,
        result_sheet_url = COALESCE(EXCLUDED.result_sheet_url, election_results.result_sheet_url),
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate on new submission
CREATE OR REPLACE FUNCTION trigger_calculate_result_mode()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_result_mode(
        NEW.polling_station_id,
        NEW.position,
        NEW.candidate_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_result_mode
    AFTER INSERT ON election_result_submissions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_result_mode();

-- Comments
COMMENT ON TABLE election_result_submissions IS 'Raw result submissions from agents (multiple per station allowed)';
COMMENT ON TABLE election_results IS 'Consolidated results using MODE calculation';
COMMENT ON COLUMN election_results.has_discrepancy IS 'True if submitted values differed, requiring review';
COMMENT ON TABLE result_sheets IS 'Gallery of result sheet images per polling station';
