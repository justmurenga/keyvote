-- =============================================
-- Migration: 0001_create_counties
-- Description: Create counties table (47 counties of Kenya)
-- =============================================

CREATE TABLE IF NOT EXISTS counties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    registered_voters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_counties_code ON counties(code);
CREATE INDEX idx_counties_name ON counties(name);

-- Add comment
COMMENT ON TABLE counties IS 'The 47 counties of Kenya';
COMMENT ON COLUMN counties.code IS 'IEBC county code (e.g., 001 for Mombasa)';
COMMENT ON COLUMN counties.registered_voters IS 'Total registered voters in the county (aggregated)';
