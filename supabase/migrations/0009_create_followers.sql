-- =============================================
-- Migration: 0009_create_followers
-- Description: Create followers table for voter-candidate relationships
-- =============================================

CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Timestamps for follow/unfollow tracking
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    unfollowed_at TIMESTAMPTZ,
    is_following BOOLEAN DEFAULT TRUE,
    
    -- Snapshot of voter's location at follow time (for analytics)
    polling_station_id UUID REFERENCES polling_stations(id),
    ward_id UUID REFERENCES wards(id),
    constituency_id UUID REFERENCES constituencies(id),
    county_id UUID REFERENCES counties(id),
    
    -- Voter demographics at follow time (for analytics)
    voter_gender gender_type,
    voter_age_bracket age_bracket,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per voter-candidate pair
    UNIQUE(voter_id, candidate_id)
);

-- Create indexes
CREATE INDEX idx_followers_voter ON followers(voter_id);
CREATE INDEX idx_followers_candidate ON followers(candidate_id);
CREATE INDEX idx_followers_is_following ON followers(is_following);
CREATE INDEX idx_followers_followed_at ON followers(followed_at);
CREATE INDEX idx_followers_county ON followers(county_id);
CREATE INDEX idx_followers_constituency ON followers(constituency_id);
CREATE INDEX idx_followers_ward ON followers(ward_id);
CREATE INDEX idx_followers_polling_station ON followers(polling_station_id);

-- Compound indexes for analytics queries
CREATE INDEX idx_followers_candidate_following ON followers(candidate_id, is_following);
CREATE INDEX idx_followers_candidate_gender ON followers(candidate_id, voter_gender) WHERE is_following = TRUE;
CREATE INDEX idx_followers_candidate_age ON followers(candidate_id, voter_age_bracket) WHERE is_following = TRUE;

-- Function to capture voter demographics on follow
CREATE OR REPLACE FUNCTION capture_follower_demographics()
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

CREATE TRIGGER tr_capture_follower_demographics
    BEFORE INSERT ON followers
    FOR EACH ROW
    EXECUTE FUNCTION capture_follower_demographics();

-- Function to update candidate follower count
CREATE OR REPLACE FUNCTION update_candidate_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE candidates
        SET follower_count = (
            SELECT COUNT(*) FROM followers 
            WHERE candidate_id = NEW.candidate_id AND is_following = TRUE
        ),
        updated_at = NOW()
        WHERE id = NEW.candidate_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE candidates
        SET follower_count = (
            SELECT COUNT(*) FROM followers 
            WHERE candidate_id = OLD.candidate_id AND is_following = TRUE
        ),
        updated_at = NOW()
        WHERE id = OLD.candidate_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_follower_count
    AFTER INSERT OR UPDATE OR DELETE ON followers
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_follower_count();

-- Comments
COMMENT ON TABLE followers IS 'Voter-to-candidate following relationships';
COMMENT ON COLUMN followers.is_following IS 'Current follow status (false = unfollowed)';
COMMENT ON COLUMN followers.voter_gender IS 'Snapshot of voter gender at follow time for analytics';
