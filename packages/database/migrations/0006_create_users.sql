-- =============================================
-- Migration: 0006_create_users
-- Description: Create users and user_preferences tables
-- =============================================

-- Main users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    gender gender_type,
    age_bracket age_bracket,
    
    -- ID number (encrypted, optional for KYC)
    id_number VARCHAR(50),
    
    -- Polling station assignment
    polling_station_id UUID REFERENCES polling_stations(id),
    
    -- Denormalized location for faster queries (populated via trigger)
    ward_id UUID REFERENCES wards(id),
    constituency_id UUID REFERENCES constituencies(id),
    county_id UUID REFERENCES counties(id),
    
    -- User role and status
    role user_role DEFAULT 'voter',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Profile
    profile_photo_url TEXT,
    bio TEXT,
    
    -- Timestamps
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification preferences
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    
    -- Poll notifications
    poll_reminders BOOLEAN DEFAULT TRUE,
    result_alerts BOOLEAN DEFAULT TRUE,
    
    -- Language preference
    language VARCHAR(10) DEFAULT 'en',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_polling_station ON users(polling_station_id);
CREATE INDEX idx_users_ward ON users(ward_id);
CREATE INDEX idx_users_constituency ON users(constituency_id);
CREATE INDEX idx_users_county ON users(county_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Full-text search on name
CREATE INDEX idx_users_name_search ON users 
    USING GIN (to_tsvector('english', full_name));

-- Trigger to populate denormalized location fields
CREATE OR REPLACE FUNCTION populate_user_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.polling_station_id IS NOT NULL THEN
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_populate_user_location
    BEFORE INSERT OR UPDATE OF polling_station_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION populate_user_location();

-- Auto-create preferences on user creation
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_create_user_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_preferences();

-- Comments
COMMENT ON TABLE users IS 'All system users (voters, candidates, agents, admins)';
COMMENT ON COLUMN users.id IS 'Links to Supabase auth.users';
COMMENT ON COLUMN users.polling_station_id IS 'The polling station where this user votes';
