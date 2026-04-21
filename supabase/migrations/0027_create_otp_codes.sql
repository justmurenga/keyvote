-- =============================================
-- Migration: 0027_create_otp_codes
-- Description: Persistent OTP storage shared across all app instances.
--              Replaces the previous in-memory Map in apps/web/src/lib/auth/otp-store.ts
--              which silently lost OTPs whenever the request landed on a
--              different container or after a deploy/restart.
--              Also re-asserts that users.phone is nullable (idempotent re-run
--              of 0026 in case it was skipped on the live database).
-- =============================================

-- 1. OTP codes table -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_codes (
    key             TEXT PRIMARY KEY,                  -- normalized phone digits OR lowercased email
    identifier      TEXT NOT NULL,                     -- original identifier (with +) for logging
    is_email        BOOLEAN NOT NULL DEFAULT FALSE,
    otp             TEXT NOT NULL,
    attempts        INTEGER NOT NULL DEFAULT 0,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at);

-- 2. Rate-limit tracker --------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    key             TEXT PRIMARY KEY,                  -- "rate:<normalized key>"
    attempts        INTEGER NOT NULL DEFAULT 0,
    window_expires_at TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_expires_at ON otp_rate_limits (window_expires_at);

-- 3. RLS — only service role touches these tables. Deny all others. ------------
ALTER TABLE otp_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_rate_limits  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'otp_codes' AND policyname = 'otp_codes_no_client_access'
    ) THEN
        CREATE POLICY otp_codes_no_client_access ON otp_codes FOR ALL TO authenticated, anon USING (FALSE) WITH CHECK (FALSE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'otp_rate_limits' AND policyname = 'otp_rate_limits_no_client_access'
    ) THEN
        CREATE POLICY otp_rate_limits_no_client_access ON otp_rate_limits FOR ALL TO authenticated, anon USING (FALSE) WITH CHECK (FALSE);
    END IF;
END$$;

-- 4. Re-assert nullable phone (idempotent guard for environments where 0026 was missed)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_or_email_present'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_phone_or_email_present
            CHECK (phone IS NOT NULL OR email IS NOT NULL);
    END IF;
END$$;

COMMENT ON TABLE otp_codes IS
    'Persistent OTP codes used by web/mobile auth flows. Backed store for lib/auth/otp-store.ts. Service-role only.';
COMMENT ON TABLE otp_rate_limits IS
    'Rolling-window OTP request rate-limit counters. Service-role only.';
