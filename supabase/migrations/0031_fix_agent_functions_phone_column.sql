-- =============================================
-- Migration: 0031_fix_agent_functions_phone_column
-- Description: 0019 referenced users.phone_number but the public.users
--              schema (migration 0006) uses the column `phone`. Those
--              CREATE FUNCTION statements therefore failed during
--              parse / first-call binding, leaving:
--                PGRST202 "Could not find the function
--                public.get_candidate_agents(p_candidate_id, p_status)"
--
--              This migration recreates both affected functions using the
--              correct column name (`u.phone`). It is idempotent.
-- =============================================

-- ---------------------------------------------------------------------------
-- invite_agent: look up existing user by `phone`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION invite_agent(
    p_candidate_id UUID,
    p_invited_phone VARCHAR,
    p_invited_name VARCHAR,
    p_region_type region_type,
    p_polling_station_id UUID DEFAULT NULL,
    p_ward_id UUID DEFAULT NULL,
    p_constituency_id UUID DEFAULT NULL,
    p_county_id UUID DEFAULT NULL,
    p_mpesa_number VARCHAR DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_agent_id UUID;
    v_token UUID;
    v_existing_user_id UUID;
    v_candidate_user_id UUID;
BEGIN
    -- Verify the caller owns this candidate
    SELECT user_id INTO v_candidate_user_id
    FROM candidates WHERE id = p_candidate_id;

    IF v_candidate_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Candidate not found');
    END IF;

    IF v_candidate_user_id != auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- Look up existing user by phone (column is `phone`, not `phone_number`)
    SELECT id INTO v_existing_user_id
    FROM users WHERE phone = p_invited_phone;

    -- Block duplicates for active/pending agents
    IF v_existing_user_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM agents
            WHERE user_id = v_existing_user_id
              AND candidate_id = p_candidate_id
              AND status IN ('pending', 'active')
        ) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'This user is already an agent or has a pending invitation for this candidate'
            );
        END IF;
    END IF;

    v_token := gen_random_uuid();

    INSERT INTO agents (
        user_id,
        candidate_id,
        assigned_region_type,
        assigned_polling_station_id,
        assigned_ward_id,
        assigned_constituency_id,
        assigned_county_id,
        mpesa_number,
        status,
        invitation_token,
        invited_phone,
        invited_name,
        invited_at
    ) VALUES (
        COALESCE(v_existing_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        p_candidate_id,
        p_region_type,
        p_polling_station_id,
        p_ward_id,
        p_constituency_id,
        p_county_id,
        COALESCE(p_mpesa_number, p_invited_phone),
        'pending',
        v_token,
        p_invited_phone,
        p_invited_name,
        NOW()
    )
    RETURNING id INTO v_agent_id;

    RETURN json_build_object(
        'success', true,
        'agent_id', v_agent_id,
        'invitation_token', v_token,
        'user_exists', v_existing_user_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- get_candidate_agents: select u.phone (not u.phone_number)
-- Drop first because the return-type signature is unchanged but we want a
-- clean re-create.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_candidate_agents(UUID, agent_status);

CREATE OR REPLACE FUNCTION get_candidate_agents(
    p_candidate_id UUID,
    p_status agent_status DEFAULT NULL
)
RETURNS TABLE (
    agent_id UUID,
    user_id UUID,
    full_name TEXT,
    phone_number TEXT,
    profile_photo_url TEXT,
    assigned_region_type region_type,
    region_name TEXT,
    mpesa_number VARCHAR,
    status agent_status,
    invited_phone VARCHAR,
    invited_name VARCHAR,
    invitation_token UUID,
    total_reports INTEGER,
    total_results_submitted INTEGER,
    total_payments_received DECIMAL,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS agent_id,
        a.user_id,
        COALESCE(u.full_name, a.invited_name, 'Pending')::TEXT AS full_name,
        COALESCE(u.phone, a.invited_phone, '')::TEXT AS phone_number,
        u.profile_photo_url::TEXT,
        a.assigned_region_type,
        COALESCE(
            ps.display_name,
            w.name,
            co2.name,
            co.name,
            'National'
        )::TEXT AS region_name,
        a.mpesa_number,
        a.status,
        a.invited_phone,
        a.invited_name,
        a.invitation_token,
        a.total_reports,
        a.total_results_submitted,
        a.total_payments_received,
        a.invited_at,
        a.accepted_at,
        a.revoked_at,
        a.revoke_reason,
        a.created_at
    FROM agents a
    LEFT JOIN users u
        ON u.id = a.user_id
       AND a.user_id != '00000000-0000-0000-0000-000000000000'
    LEFT JOIN polling_stations ps ON ps.id = a.assigned_polling_station_id
    LEFT JOIN wards w           ON w.id  = a.assigned_ward_id
    LEFT JOIN constituencies co2 ON co2.id = a.assigned_constituency_id
    LEFT JOIN counties co        ON co.id  = a.assigned_county_id
    WHERE a.candidate_id = p_candidate_id
      AND (p_status IS NULL OR a.status = p_status)
    ORDER BY
        CASE a.status
            WHEN 'active'    THEN 1
            WHEN 'pending'   THEN 2
            WHEN 'suspended' THEN 3
            WHEN 'revoked'   THEN 4
        END,
        a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST to refresh its schema cache so the function becomes callable
-- immediately (otherwise client may keep seeing PGRST202 until next reload).
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION get_candidate_agents(UUID, agent_status)
    IS 'Returns agents for a candidate; uses users.phone (fixed in migration 0031).';
COMMENT ON FUNCTION invite_agent(UUID, VARCHAR, VARCHAR, region_type, UUID, UUID, UUID, UUID, VARCHAR)
    IS 'Creates an agent invitation; uses users.phone (fixed in migration 0031).';
