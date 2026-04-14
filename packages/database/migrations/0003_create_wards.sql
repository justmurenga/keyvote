-- =============================================
-- Migration: 0003_create_wards
-- Description: Create wards table (County Assembly Wards - CAW)
-- =============================================

CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    constituency_id UUID NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
    registered_voters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wards_code ON wards(code);
CREATE INDEX idx_wards_name ON wards(name);
CREATE INDEX idx_wards_constituency ON wards(constituency_id);

-- Add comments
COMMENT ON TABLE wards IS 'County Assembly Wards (CAW) - approximately 1,450 wards';
COMMENT ON COLUMN wards.code IS 'IEBC ward code (CAW Code from Excel)';
COMMENT ON COLUMN wards.constituency_id IS 'Parent constituency reference';
