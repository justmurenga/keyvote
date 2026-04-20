-- =============================================
-- Migration: 0019_agent_management_functions
-- Description: Agent management functions and missing RLS policies
-- =============================================

-- =============================================
-- Fix: Add missing RLS policies for agent_reports
-- =============================================

CREATE POLICY "Agents can view their own reports"
    ON agent_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_reports.agent_id
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Agents can create reports"
    ON agent_reports FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_reports.agent_id
            AND agents.user_id = auth.uid()
            AND agents.status = 'active'
        )
    );

CREATE POLICY "Candidates can view their agents reports"
    ON agent_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agents a
            JOIN candidates c ON c.id = a.candidate_id
            WHERE a.id = agent_reports.agent_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Candidates can review agent reports"
    ON agent_reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM agents a
            JOIN candidates c ON c.id = a.candidate_id
            WHERE a.id = agent_reports.agent_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "System admins can view all agents"
    ON agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

CREATE POLICY "System admins can view all agent reports"
    ON agent_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

-- =============================================
-- Add invitation_token column to agents table
-- =============================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();
ALTER TABLE agents ADD COLUMN IF NOT EXISTS invited_phone VARCHAR(15);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS invited_name VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_invitation_token ON agents(invitation_token) WHERE invitation_token IS NOT NULL;

-- =============================================
-- Function: invite_agent
-- Creates an agent invitation record
-- =============================================

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
        RETURN json_build_object('success', false, 'error', 'Unauthorized: not your candidate profile');
    END IF;

    -- Normalize phone number
    IF p_invited_phone LIKE '0%' THEN
        p_invited_phone := '+254' || substring(p_invited_phone from 2);
    END IF;

    -- Check if user exists by phone
    SELECT id INTO v_existing_user_id
    FROM users WHERE phone_number = p_invited_phone;

    -- Check for existing agent relationship
    IF v_existing_user_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM agents 
            WHERE user_id = v_existing_user_id 
            AND candidate_id = p_candidate_id 
            AND status IN ('pending', 'active')
        ) THEN
            RETURN json_build_object('success', false, 'error', 'This user is already an agent or has a pending invitation for this candidate');
        END IF;
    END IF;

    -- Generate invitation token
    v_token := gen_random_uuid();

    -- Create agent record
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

-- =============================================
-- Function: accept_agent_invitation
-- Agent accepts invitation using token
-- =============================================

CREATE OR REPLACE FUNCTION accept_agent_invitation(
    p_invitation_token UUID
)
RETURNS JSON AS $$
DECLARE
    v_agent RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Find the invitation
    SELECT * INTO v_agent
    FROM agents
    WHERE invitation_token = p_invitation_token;

    IF v_agent IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid invitation token');
    END IF;

    IF v_agent.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'This invitation has already been ' || v_agent.status);
    END IF;

    -- Update agent record: assign user, activate
    UPDATE agents
    SET user_id = v_user_id,
        status = 'active',
        accepted_at = NOW(),
        invitation_token = NULL,
        updated_at = NOW()
    WHERE id = v_agent.id;

    -- Update user role to agent (if currently voter)
    UPDATE users
    SET role = 'agent', updated_at = NOW()
    WHERE id = v_user_id AND role = 'voter';

    RETURN json_build_object(
        'success', true,
        'agent_id', v_agent.id,
        'candidate_id', v_agent.candidate_id,
        'message', 'Invitation accepted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: revoke_agent
-- Candidate revokes an agent
-- =============================================

CREATE OR REPLACE FUNCTION revoke_agent(
    p_agent_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_agent RECORD;
    v_candidate_user_id UUID;
BEGIN
    -- Get agent and verify ownership
    SELECT a.*, c.user_id as candidate_owner_id
    INTO v_agent
    FROM agents a
    JOIN candidates c ON c.id = a.candidate_id
    WHERE a.id = p_agent_id;

    IF v_agent IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Agent not found');
    END IF;

    IF v_agent.candidate_owner_id != auth.uid() THEN
        -- Check if system admin
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'system_admin') THEN
            RETURN json_build_object('success', false, 'error', 'Unauthorized');
        END IF;
    END IF;

    IF v_agent.status = 'revoked' THEN
        RETURN json_build_object('success', false, 'error', 'Agent is already revoked');
    END IF;

    -- Revoke the agent
    UPDATE agents
    SET status = 'revoked',
        revoked_at = NOW(),
        revoke_reason = p_reason,
        invitation_token = NULL,
        updated_at = NOW()
    WHERE id = p_agent_id;

    RETURN json_build_object(
        'success', true,
        'agent_id', p_agent_id,
        'message', 'Agent revoked successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: get_candidate_agents
-- Returns a candidate's agents with user and region info
-- =============================================

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
        COALESCE(u.phone_number, a.invited_phone, '')::TEXT AS phone_number,
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
    LEFT JOIN users u ON u.id = a.user_id AND a.user_id != '00000000-0000-0000-0000-000000000000'
    LEFT JOIN polling_stations ps ON ps.id = a.assigned_polling_station_id
    LEFT JOIN wards w ON w.id = a.assigned_ward_id
    LEFT JOIN constituencies co2 ON co2.id = a.assigned_constituency_id
    LEFT JOIN counties co ON co.id = a.assigned_county_id
    WHERE a.candidate_id = p_candidate_id
    AND (p_status IS NULL OR a.status = p_status)
    ORDER BY
        CASE a.status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'suspended' THEN 3
            WHEN 'revoked' THEN 4
        END,
        a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
