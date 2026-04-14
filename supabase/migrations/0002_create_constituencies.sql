-- =============================================
-- Migration: 0002_create_constituencies
-- Description: Create constituencies table (290 constituencies)
-- =============================================

CREATE TABLE IF NOT EXISTS constituencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    county_id UUID NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
    registered_voters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_constituencies_code ON constituencies(code);
CREATE INDEX idx_constituencies_name ON constituencies(name);
CREATE INDEX idx_constituencies_county ON constituencies(county_id);

-- Add comments
COMMENT ON TABLE constituencies IS 'The 290 constituencies of Kenya';
COMMENT ON COLUMN constituencies.code IS 'IEBC constituency code';
COMMENT ON COLUMN constituencies.county_id IS 'Parent county reference';
