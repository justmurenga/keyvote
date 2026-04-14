-- =============================================
-- Migration: 0004_create_polling_stations
-- Description: Create polling stations table with stream support
-- =============================================

CREATE TABLE IF NOT EXISTS polling_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    stream VARCHAR(5), -- A, B, C, etc. for multi-stream stations
    
    -- Registration centre info (from Excel columns G, H)
    reg_centre_code VARCHAR(10),
    reg_centre_name VARCHAR(200),
    
    -- Computed display name: "Station Name Stream A" or just "Station Name"
    display_name VARCHAR(250) GENERATED ALWAYS AS (
        CASE 
            WHEN stream IS NOT NULL AND stream != '' 
            THEN name || ' Stream ' || stream 
            ELSE name 
        END
    ) STORED,
    
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    registered_voters INTEGER NOT NULL DEFAULT 0,
    
    -- GPS coordinates (optional, for future use)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint on code + stream within same ward
    UNIQUE(code, stream)
);

-- Create indexes for common queries
CREATE INDEX idx_polling_stations_code ON polling_stations(code);
CREATE INDEX idx_polling_stations_name ON polling_stations(name);
CREATE INDEX idx_polling_stations_ward ON polling_stations(ward_id);
CREATE INDEX idx_polling_stations_reg_centre ON polling_stations(reg_centre_code);
CREATE INDEX idx_polling_stations_display_name ON polling_stations(display_name);

-- Full-text search index for polling station lookup
CREATE INDEX idx_polling_stations_search ON polling_stations 
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(display_name, '')));

-- Add comments
COMMENT ON TABLE polling_stations IS 'All polling stations in Kenya with stream support';
COMMENT ON COLUMN polling_stations.code IS 'IEBC polling station code (Column I from Excel)';
COMMENT ON COLUMN polling_stations.stream IS 'Stream identifier (A, B, C...) for multi-stream stations';
COMMENT ON COLUMN polling_stations.display_name IS 'Auto-generated display name including stream';
COMMENT ON COLUMN polling_stations.reg_centre_code IS 'Registration centre code (Column G from Excel)';
COMMENT ON COLUMN polling_stations.reg_centre_name IS 'Registration centre name (Column H from Excel)';
COMMENT ON COLUMN polling_stations.registered_voters IS 'Number of registered voters (Column K from Excel)';
