-- =============================================
-- Migration: 0005_create_enums
-- Description: Create all enum types for the system
-- =============================================

-- User roles
CREATE TYPE user_role AS ENUM (
    'voter',
    'candidate', 
    'agent',
    'party_admin',
    'system_admin'
);

-- Gender options
CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'prefer_not_to_say'
);

-- Age brackets
CREATE TYPE age_bracket AS ENUM (
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65+'
);

-- Electoral positions
CREATE TYPE electoral_position AS ENUM (
    'president',
    'governor',
    'senator',
    'women_rep',
    'mp',
    'mca'
);

-- Region types (for agent assignment, etc.)
CREATE TYPE region_type AS ENUM (
    'polling_station',
    'ward',
    'constituency',
    'county',
    'national'
);

-- Agent status
CREATE TYPE agent_status AS ENUM (
    'pending',
    'active',
    'suspended',
    'revoked'
);

-- Poll status
CREATE TYPE poll_status AS ENUM (
    'draft',
    'scheduled',
    'active',
    'completed',
    'cancelled'
);

-- Transaction types for wallet
CREATE TYPE transaction_type AS ENUM (
    'topup',
    'sms_charge',
    'whatsapp_charge',
    'poll_view_charge',
    'result_view_charge',
    'mpesa_disbursement',
    'subscription_charge',
    'refund',
    'credit_purchase'
);

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'reversed'
);

-- Verification status
CREATE TYPE verification_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);

-- Comments
COMMENT ON TYPE user_role IS 'User role types in the system';
COMMENT ON TYPE electoral_position IS 'Electoral positions: president, governor, senator, women_rep, mp, mca';
COMMENT ON TYPE age_bracket IS 'Age brackets for demographic analysis';
