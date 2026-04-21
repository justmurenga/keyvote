-- =============================================
-- Migration: 0026_make_users_phone_nullable
-- Description: Allow email-only registrations by making users.phone nullable.
--              Add a CHECK constraint to ensure each user has at least one of
--              phone or email so we can always reach them for OTP / comms.
-- =============================================

-- 1. Drop NOT NULL on phone (already UNIQUE; UNIQUE allows multiple NULLs in PG).
ALTER TABLE users
    ALTER COLUMN phone DROP NOT NULL;

-- 2. Make sure email column exists and is nullable (it already is per 0006),
--    but enforce that at least one identifier is present.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_phone_or_email_present'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_phone_or_email_present
            CHECK (phone IS NOT NULL OR email IS NOT NULL);
    END IF;
END$$;

COMMENT ON CONSTRAINT users_phone_or_email_present ON users IS
    'Every user must have at least a phone number or an email address.';
