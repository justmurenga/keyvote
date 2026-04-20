-- ============================================================================
-- Migration: 0024 — Update RLS Policies to use RBAC
-- Description: Replaces all legacy `users.role = 'system_admin'` and
--              `users.role IN ('party_admin','system_admin')` checks
--              with the new RBAC helper functions from 0023.
--              Also updates SQL functions that set/check users.role.
-- ============================================================================

-- ============================================================================
-- 1. FIX: 0015 — Candidates policy (system_admin check)
-- ============================================================================
DROP POLICY IF EXISTS "Candidates in electoral line are viewable" ON candidates;
CREATE POLICY "Candidates in electoral line are viewable"
    ON candidates FOR SELECT
    USING (
        is_active = true
        AND (
            is_candidate_in_electoral_line(candidates, auth.uid())
            OR user_id = auth.uid()
            OR is_system_admin(auth.uid())
        )
    );

-- ============================================================================
-- 2. FIX: 0015 — Polls policy (system_admin check)
-- ============================================================================
DROP POLICY IF EXISTS "System admins can manage polls" ON polls;
CREATE POLICY "System admins can manage polls"
    ON polls FOR ALL
    USING (is_system_admin(auth.uid()));

-- ============================================================================
-- 3. FIX: 0015 — Election results policy (system_admin check)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view results in their electoral line" ON election_results;
CREATE POLICY "Users can view results in their electoral line"
    ON election_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (
                election_results.county_id = u.county_id
                OR is_system_admin(auth.uid())
            )
        )
    );

-- ============================================================================
-- 4. FIX: 0015 — Party admin update policy → use RBAC party admin check
-- ============================================================================
DROP POLICY IF EXISTS "Party admins can update their party" ON political_parties;
CREATE POLICY "Party admins can update their party"
    ON political_parties FOR UPDATE
    USING (
        is_party_admin(auth.uid(), political_parties.id)
    );

-- ============================================================================
-- 5. FIX: 0019 — System admin agent policies
-- ============================================================================
DROP POLICY IF EXISTS "System admins can view all agents" ON agents;
CREATE POLICY "System admins can view all agents"
    ON agents FOR SELECT
    USING (is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "System admins can view all agent reports" ON agent_reports;
CREATE POLICY "System admins can view all agent reports"
    ON agent_reports FOR SELECT
    USING (is_system_admin(auth.uid()));

-- ============================================================================
-- 6. FIX: 0019 — revoke_agent function (system admin check inside function)
-- ============================================================================
CREATE OR REPLACE FUNCTION revoke_agent(
    p_agent_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_agent RECORD;
BEGIN
    SELECT a.*, c.user_id as candidate_owner_id
    INTO v_agent
    FROM agents a
    JOIN candidates c ON c.id = a.candidate_id
    WHERE a.id = p_agent_id;

    IF v_agent IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Agent not found');
    END IF;

    IF v_agent.candidate_owner_id != auth.uid() THEN
        IF NOT is_system_admin(auth.uid()) THEN
            RETURN json_build_object('success', false, 'error', 'Unauthorized');
        END IF;
    END IF;

    IF v_agent.status = 'revoked' THEN
        RETURN json_build_object('success', false, 'error', 'Agent is already revoked');
    END IF;

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

-- ============================================================================
-- 7. FIX: 0019 — accept_agent_invitation (sets users.role = 'agent')
--    Now also assigns the 'party_agent' RBAC role for the candidate's party
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_agent_invitation(
    p_invitation_token UUID
)
RETURNS JSON AS $$
DECLARE
    v_agent RECORD;
    v_user_id UUID;
    v_party_id UUID;
    v_agent_role_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_agent
    FROM agents
    WHERE invitation_token = p_invitation_token;

    IF v_agent IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid invitation token');
    END IF;

    IF v_agent.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'This invitation has already been ' || v_agent.status);
    END IF;

    -- Update agent record
    UPDATE agents
    SET user_id = v_user_id,
        status = 'active',
        accepted_at = NOW(),
        invitation_token = NULL,
        updated_at = NOW()
    WHERE id = v_agent.id;

    -- Keep legacy column in sync
    UPDATE users
    SET role = 'agent', updated_at = NOW()
    WHERE id = v_user_id AND role = 'voter';

    -- Also assign RBAC party_agent role for the candidate's party
    SELECT c.party_id INTO v_party_id
    FROM candidates c WHERE c.id = v_agent.candidate_id;

    IF v_party_id IS NOT NULL THEN
        SELECT id INTO v_agent_role_id FROM roles WHERE name = 'party_agent';
        IF v_agent_role_id IS NOT NULL THEN
            INSERT INTO user_role_assignments (user_id, role_id, party_id, assigned_by, notes)
            VALUES (v_user_id, v_agent_role_id, v_party_id, v_user_id, 'Auto-assigned on agent invitation acceptance')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'agent_id', v_agent.id,
        'candidate_id', v_agent.candidate_id,
        'message', 'Invitation accepted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. FIX: 0021 — System settings policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can read all settings" ON system_settings;
CREATE POLICY "Admins can read all settings"
    ON system_settings FOR SELECT
    USING (is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update settings" ON system_settings;
CREATE POLICY "Admins can update settings"
    ON system_settings FOR UPDATE
    USING (is_system_admin(auth.uid()));

-- ============================================================================
-- 9. FIX: 0022 — Candidate/party fee policies
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage vying fees" ON candidate_vying_fees;
CREATE POLICY "Admins can manage vying fees"
    ON candidate_vying_fees FOR ALL
    USING (is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage nomination fees" ON party_nomination_fees;
CREATE POLICY "Admins can manage nomination fees"
    ON party_nomination_fees FOR ALL
    USING (is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own fee payments" ON candidate_fee_payments;
CREATE POLICY "Users can view own fee payments"
    ON candidate_fee_payments FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_system_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage fee payments" ON candidate_fee_payments;
CREATE POLICY "Admins can manage fee payments"
    ON candidate_fee_payments FOR ALL
    USING (is_system_admin(auth.uid()));

-- ============================================================================
-- 10. ADD: System admins can manage users
-- ============================================================================
DROP POLICY IF EXISTS "System admins can manage users" ON users;
CREATE POLICY "System admins can manage users"
    ON users FOR ALL
    USING (is_system_admin(auth.uid()));

-- ============================================================================
-- Done. All RLS policies now use RBAC helper functions.
-- ============================================================================
