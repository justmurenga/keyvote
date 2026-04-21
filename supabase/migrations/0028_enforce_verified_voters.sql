-- =============================================
-- Migration: 0028_enforce_verified_voters
-- Description: Enforce that only users who have verified
--              their details (is_verified = TRUE) and set
--              their location (polling_station_id NOT NULL)
--              can cast votes in polls.
-- =============================================

-- Trigger function: validates voter eligibility before any
-- INSERT into poll_votes. This runs in addition to RLS so that
-- the rule cannot be bypassed by service-role clients (web/USSD
-- API endpoints) using elevated keys.
CREATE OR REPLACE FUNCTION enforce_voter_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_is_verified BOOLEAN;
    v_polling_station UUID;
    v_is_active BOOLEAN;
BEGIN
    SELECT is_verified, polling_station_id, is_active
      INTO v_is_verified, v_polling_station, v_is_active
      FROM users
     WHERE id = NEW.voter_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voter % does not exist', NEW.voter_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF v_is_active IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Account is not active'
            USING ERRCODE = 'check_violation',
                  HINT = 'voter_inactive';
    END IF;

    IF v_is_verified IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Voter must verify their details before voting'
            USING ERRCODE = 'check_violation',
                  HINT = 'voter_not_verified';
    END IF;

    IF v_polling_station IS NULL THEN
        RAISE EXCEPTION 'Voter must set their polling station / location before voting'
            USING ERRCODE = 'check_violation',
                  HINT = 'voter_location_missing';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_voter_eligibility ON poll_votes;

CREATE TRIGGER tr_enforce_voter_eligibility
    BEFORE INSERT ON poll_votes
    FOR EACH ROW
    EXECUTE FUNCTION enforce_voter_eligibility();

-- Tighten the existing RLS INSERT policy on poll_votes so that
-- regular authenticated clients are also pre-filtered before the
-- trigger runs. This gives a faster, clearer permission error.
DROP POLICY IF EXISTS "Users can vote" ON poll_votes;

CREATE POLICY "Verified users can vote"
    ON poll_votes FOR INSERT
    WITH CHECK (
        voter_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM users u
             WHERE u.id = auth.uid()
               AND u.is_verified = TRUE
               AND u.is_active = TRUE
               AND u.polling_station_id IS NOT NULL
        )
    );

COMMENT ON FUNCTION enforce_voter_eligibility() IS
    'Blocks poll_votes inserts when the voter is not verified, inactive, or has no polling station / location set.';
