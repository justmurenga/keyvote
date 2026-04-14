-- =============================================
-- Migration: 0007_create_political_parties
-- Description: Create political parties and membership tables
-- =============================================

-- Political parties table
CREATE TABLE IF NOT EXISTS political_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) UNIQUE NOT NULL,
    abbreviation VARCHAR(20) UNIQUE NOT NULL,
    
    -- Branding
    symbol_url TEXT,
    primary_color VARCHAR(7), -- Hex color e.g., #FF5733
    secondary_color VARCHAR(7),
    
    -- Official details
    registration_number VARCHAR(50), -- ORPP registration
    headquarters VARCHAR(300),
    website_url TEXT,
    founded_date DATE,
    
    -- Leadership
    leader_name VARCHAR(200),
    secretary_general VARCHAR(200),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    -- Contact
    contact_email VARCHAR(255),
    contact_phone VARCHAR(15),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party membership table
CREATE TABLE IF NOT EXISTS party_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES political_parties(id) ON DELETE CASCADE,
    
    membership_number VARCHAR(50),
    role VARCHAR(100) DEFAULT 'member', -- 'member', 'official', 'leader'
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, party_id)
);

-- Create indexes
CREATE INDEX idx_political_parties_name ON political_parties(name);
CREATE INDEX idx_political_parties_abbreviation ON political_parties(abbreviation);
CREATE INDEX idx_political_parties_verified ON political_parties(is_verified);

CREATE INDEX idx_party_members_user ON party_members(user_id);
CREATE INDEX idx_party_members_party ON party_members(party_id);

-- Comments
COMMENT ON TABLE political_parties IS 'Registered political parties in Kenya';
COMMENT ON COLUMN political_parties.registration_number IS 'ORPP (Office of Registrar of Political Parties) registration';
COMMENT ON TABLE party_members IS 'Party membership records for users';
