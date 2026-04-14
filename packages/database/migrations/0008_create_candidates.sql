-- =============================================
-- Migration: 0008_create_candidates
-- Description: Create candidates table
-- =============================================

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Electoral position
    position electoral_position NOT NULL,
    
    -- Electoral region (depends on position)
    -- President: all NULL (national level)
    -- Governor, Senator, Women Rep: county_id set
    -- MP: constituency_id set
    -- MCA: ward_id set
    county_id UUID REFERENCES counties(id),
    constituency_id UUID REFERENCES constituencies(id),
    ward_id UUID REFERENCES wards(id),
    
    -- Party affiliation
    party_id UUID REFERENCES political_parties(id),
    is_independent BOOLEAN DEFAULT FALSE,
    
    -- Profile content
    campaign_slogan VARCHAR(500),
    manifesto_text TEXT,
    manifesto_pdf_url TEXT,
    campaign_video_url TEXT,
    
    -- Social media
    facebook_url TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Statistics (updated via triggers/functions)
    follower_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either party affiliation or independent
    CONSTRAINT chk_party_or_independent CHECK (
        (party_id IS NOT NULL AND is_independent = FALSE) OR
        (party_id IS NULL AND is_independent = TRUE)
    ),
    
    -- Ensure correct region level for position
    CONSTRAINT chk_position_region CHECK (
        (position = 'president' AND county_id IS NULL AND constituency_id IS NULL AND ward_id IS NULL) OR
        (position IN ('governor', 'senator', 'women_rep') AND county_id IS NOT NULL AND constituency_id IS NULL AND ward_id IS NULL) OR
        (position = 'mp' AND constituency_id IS NOT NULL AND ward_id IS NULL) OR
        (position = 'mca' AND ward_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX idx_candidates_user ON candidates(user_id);
CREATE INDEX idx_candidates_position ON candidates(position);
CREATE INDEX idx_candidates_county ON candidates(county_id);
CREATE INDEX idx_candidates_constituency ON candidates(constituency_id);
CREATE INDEX idx_candidates_ward ON candidates(ward_id);
CREATE INDEX idx_candidates_party ON candidates(party_id);
CREATE INDEX idx_candidates_verified ON candidates(is_verified);
CREATE INDEX idx_candidates_active ON candidates(is_active);

-- Compound indexes for common queries
CREATE INDEX idx_candidates_position_county ON candidates(position, county_id) 
    WHERE position IN ('governor', 'senator', 'women_rep');
CREATE INDEX idx_candidates_position_constituency ON candidates(position, constituency_id) 
    WHERE position = 'mp';
CREATE INDEX idx_candidates_position_ward ON candidates(position, ward_id) 
    WHERE position = 'mca';

-- Update user role to candidate when candidate profile is created
CREATE OR REPLACE FUNCTION update_user_role_to_candidate()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET role = 'candidate', updated_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_user_role_candidate
    AFTER INSERT ON candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_user_role_to_candidate();

-- Comments
COMMENT ON TABLE candidates IS 'Electoral candidates/aspirants';
COMMENT ON COLUMN candidates.position IS 'Electoral position: president, governor, senator, women_rep, mp, mca';
COMMENT ON COLUMN candidates.is_independent IS 'True if candidate is running as independent (no party)';
