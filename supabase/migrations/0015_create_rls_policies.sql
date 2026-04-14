-- =============================================
-- Migration: 0015_create_rls_policies
-- Description: Row Level Security policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE polling_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE political_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_result_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Electoral Units (Public Read)
-- =============================================

CREATE POLICY "Counties are viewable by everyone"
    ON counties FOR SELECT
    USING (true);

CREATE POLICY "Constituencies are viewable by everyone"
    ON constituencies FOR SELECT
    USING (true);

CREATE POLICY "Wards are viewable by everyone"
    ON wards FOR SELECT
    USING (true);

CREATE POLICY "Polling stations are viewable by everyone"
    ON polling_stations FOR SELECT
    USING (true);

-- =============================================
-- Users
-- =============================================

CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Public user profiles are viewable"
    ON users FOR SELECT
    USING (is_active = true);

-- =============================================
-- User Preferences
-- =============================================

CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================
-- Political Parties
-- =============================================

CREATE POLICY "Political parties are viewable by everyone"
    ON political_parties FOR SELECT
    USING (is_active = true);

CREATE POLICY "Party admins can update their party"
    ON political_parties FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM party_members pm
            WHERE pm.party_id = political_parties.id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('leader', 'official')
        )
    );

-- =============================================
-- Candidates
-- =============================================

-- Helper function to check if candidate is in user's electoral line
CREATE OR REPLACE FUNCTION is_candidate_in_electoral_line(
    candidate_row candidates,
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_county UUID;
    v_user_constituency UUID;
    v_user_ward UUID;
BEGIN
    -- Get user's location
    SELECT county_id, constituency_id, ward_id
    INTO v_user_county, v_user_constituency, v_user_ward
    FROM users WHERE id = user_id;
    
    -- President is visible to everyone
    IF candidate_row.position = 'president' THEN
        RETURN TRUE;
    END IF;
    
    -- County-level positions (Governor, Senator, Women Rep)
    IF candidate_row.position IN ('governor', 'senator', 'women_rep') THEN
        RETURN candidate_row.county_id = v_user_county;
    END IF;
    
    -- MP
    IF candidate_row.position = 'mp' THEN
        RETURN candidate_row.constituency_id = v_user_constituency;
    END IF;
    
    -- MCA
    IF candidate_row.position = 'mca' THEN
        RETURN candidate_row.ward_id = v_user_ward;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Candidates in electoral line are viewable"
    ON candidates FOR SELECT
    USING (
        is_active = true
        AND (
            -- User can see candidates in their electoral line
            is_candidate_in_electoral_line(candidates, auth.uid())
            OR
            -- Candidates can see themselves
            user_id = auth.uid()
            OR
            -- System admins can see all
            EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid() AND role = 'system_admin'
            )
        )
    );

CREATE POLICY "Candidates can update their own profile"
    ON candidates FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can create candidate profile"
    ON candidates FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- =============================================
-- Followers
-- =============================================

CREATE POLICY "Users can see their own follows"
    ON followers FOR SELECT
    USING (voter_id = auth.uid());

CREATE POLICY "Candidates can see their followers"
    ON followers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM candidates
            WHERE candidates.id = followers.candidate_id
            AND candidates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can follow candidates"
    ON followers FOR INSERT
    WITH CHECK (voter_id = auth.uid());

CREATE POLICY "Users can update their follows"
    ON followers FOR UPDATE
    USING (voter_id = auth.uid());

-- =============================================
-- Agents
-- =============================================

CREATE POLICY "Agents can see their own record"
    ON agents FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Candidates can see their agents"
    ON agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM candidates
            WHERE candidates.id = agents.candidate_id
            AND candidates.user_id = auth.uid()
        )
    );

CREATE POLICY "Candidates can manage agents"
    ON agents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidates
            WHERE candidates.id = agents.candidate_id
            AND candidates.user_id = auth.uid()
        )
    );

-- =============================================
-- Polls
-- =============================================

CREATE POLICY "Active polls are viewable"
    ON polls FOR SELECT
    USING (status IN ('active', 'completed'));

CREATE POLICY "System admins can manage polls"
    ON polls FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

-- =============================================
-- Poll Votes
-- =============================================

CREATE POLICY "Users can see their own votes"
    ON poll_votes FOR SELECT
    USING (voter_id = auth.uid());

CREATE POLICY "Users can vote"
    ON poll_votes FOR INSERT
    WITH CHECK (voter_id = auth.uid());

-- Note: Poll results aggregates are handled by views/functions

-- =============================================
-- Election Results
-- =============================================

-- Results viewing follows similar electoral line logic
CREATE POLICY "Users can view results in their electoral line"
    ON election_results FOR SELECT
    USING (
        -- Users can see results in their region
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (
                -- Same county
                election_results.county_id = u.county_id
                OR
                -- System admin
                u.role = 'system_admin'
            )
        )
    );

-- =============================================
-- Wallets
-- =============================================

CREATE POLICY "Users can view their own wallet"
    ON wallets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view their own transactions"
    ON wallet_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM wallets
            WHERE wallets.id = wallet_transactions.wallet_id
            AND wallets.user_id = auth.uid()
        )
    );

-- =============================================
-- Conversations & Messages
-- =============================================

CREATE POLICY "Users can see their conversations"
    ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM candidates c
            WHERE c.id = conversations.candidate_id AND c.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM agents a
            WHERE a.id = conversations.agent_id AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can see messages in their conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations conv
            WHERE conv.id = messages.conversation_id
            AND (
                EXISTS (SELECT 1 FROM candidates c WHERE c.id = conv.candidate_id AND c.user_id = auth.uid())
                OR
                EXISTS (SELECT 1 FROM agents a WHERE a.id = conv.agent_id AND a.user_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can send messages in their conversations"
    ON messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());

-- =============================================
-- SMS Campaigns
-- =============================================

CREATE POLICY "Users can see their own campaigns"
    ON sms_campaigns FOR SELECT
    USING (sender_id = auth.uid());

CREATE POLICY "Users can create campaigns"
    ON sms_campaigns FOR INSERT
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own campaigns"
    ON sms_campaigns FOR UPDATE
    USING (sender_id = auth.uid());
