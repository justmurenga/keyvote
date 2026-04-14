-- =============================================
-- Migration: 0016_create_functions
-- Description: Utility functions and views
-- =============================================

-- =============================================
-- Aggregation Functions
-- =============================================

-- Function to aggregate registered voters up the hierarchy
CREATE OR REPLACE FUNCTION aggregate_registered_voters()
RETURNS void AS $$
BEGIN
    -- Update ward totals
    UPDATE wards w
    SET registered_voters = (
        SELECT COALESCE(SUM(registered_voters), 0)
        FROM polling_stations ps
        WHERE ps.ward_id = w.id
    );
    
    -- Update constituency totals
    UPDATE constituencies c
    SET registered_voters = (
        SELECT COALESCE(SUM(registered_voters), 0)
        FROM wards w
        WHERE w.constituency_id = c.id
    );
    
    -- Update county totals
    UPDATE counties co
    SET registered_voters = (
        SELECT COALESCE(SUM(registered_voters), 0)
        FROM constituencies c
        WHERE c.county_id = co.id
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Electoral Line Functions
-- =============================================

-- Get user's complete electoral line
CREATE OR REPLACE FUNCTION get_user_electoral_line(p_user_id UUID)
RETURNS TABLE (
    polling_station_id UUID,
    polling_station_name TEXT,
    ward_id UUID,
    ward_name TEXT,
    constituency_id UUID,
    constituency_name TEXT,
    county_id UUID,
    county_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.display_name,
        w.id,
        w.name,
        c.id,
        c.name,
        co.id,
        co.name
    FROM users u
    LEFT JOIN polling_stations ps ON u.polling_station_id = ps.id
    LEFT JOIN wards w ON ps.ward_id = w.id
    LEFT JOIN constituencies c ON w.constituency_id = c.id
    LEFT JOIN counties co ON c.county_id = co.id
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get candidates in user's electoral line
CREATE OR REPLACE FUNCTION get_candidates_in_electoral_line(p_user_id UUID)
RETURNS SETOF candidates AS $$
DECLARE
    v_county_id UUID;
    v_constituency_id UUID;
    v_ward_id UUID;
BEGIN
    -- Get user's location
    SELECT county_id, constituency_id, ward_id
    INTO v_county_id, v_constituency_id, v_ward_id
    FROM users WHERE id = p_user_id;
    
    RETURN QUERY
    SELECT * FROM candidates
    WHERE is_active = true
    AND (
        -- President (national)
        position = 'president'
        OR
        -- County-level positions
        (position IN ('governor', 'senator', 'women_rep') AND county_id = v_county_id)
        OR
        -- Constituency-level
        (position = 'mp' AND constituency_id = v_constituency_id)
        OR
        -- Ward-level
        (position = 'mca' AND ward_id = v_ward_id)
    )
    ORDER BY 
        CASE position
            WHEN 'president' THEN 1
            WHEN 'governor' THEN 2
            WHEN 'senator' THEN 3
            WHEN 'women_rep' THEN 4
            WHEN 'mp' THEN 5
            WHEN 'mca' THEN 6
        END;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Poll Results Functions
-- =============================================

-- Get poll results aggregated by region
CREATE OR REPLACE FUNCTION get_poll_results(
    p_poll_id UUID,
    p_region_type region_type DEFAULT 'national',
    p_region_id UUID DEFAULT NULL
)
RETURNS TABLE (
    candidate_id UUID,
    candidate_name TEXT,
    party_name TEXT,
    vote_count BIGINT,
    percentage DECIMAL(5, 2)
) AS $$
DECLARE
    v_total_votes BIGINT;
BEGIN
    -- Calculate total votes for the scope
    SELECT COUNT(*) INTO v_total_votes
    FROM poll_votes pv
    WHERE pv.poll_id = p_poll_id
    AND (
        p_region_type = 'national'
        OR (p_region_type = 'county' AND pv.county_id = p_region_id)
        OR (p_region_type = 'constituency' AND pv.constituency_id = p_region_id)
        OR (p_region_type = 'ward' AND pv.ward_id = p_region_id)
        OR (p_region_type = 'polling_station' AND pv.polling_station_id = p_region_id)
    );
    
    RETURN QUERY
    SELECT 
        c.id,
        u.full_name,
        pp.name,
        COUNT(pv.id)::BIGINT,
        CASE 
            WHEN v_total_votes > 0 
            THEN ROUND((COUNT(pv.id)::DECIMAL / v_total_votes * 100), 2)
            ELSE 0
        END
    FROM candidates c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN political_parties pp ON c.party_id = pp.id
    LEFT JOIN poll_votes pv ON pv.candidate_id = c.id AND pv.poll_id = p_poll_id
    WHERE EXISTS (
        SELECT 1 FROM polls p WHERE p.id = p_poll_id AND p.position = c.position
    )
    AND (
        p_region_type = 'national'
        OR (p_region_type = 'county' AND pv.county_id = p_region_id)
        OR (p_region_type = 'constituency' AND pv.constituency_id = p_region_id)
        OR (p_region_type = 'ward' AND pv.ward_id = p_region_id)
        OR (p_region_type = 'polling_station' AND pv.polling_station_id = p_region_id)
    )
    GROUP BY c.id, u.full_name, pp.name
    ORDER BY COUNT(pv.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Election Results Functions
-- =============================================

-- Get election results aggregated by region
CREATE OR REPLACE FUNCTION get_election_results(
    p_position electoral_position,
    p_region_type region_type DEFAULT 'national',
    p_region_id UUID DEFAULT NULL
)
RETURNS TABLE (
    candidate_id UUID,
    candidate_name TEXT,
    party_name TEXT,
    party_abbreviation TEXT,
    party_color TEXT,
    total_votes BIGINT,
    percentage DECIMAL(5, 2),
    stations_reported BIGINT
) AS $$
DECLARE
    v_total_votes BIGINT;
    v_total_stations BIGINT;
BEGIN
    -- Calculate totals for the scope
    SELECT 
        COALESCE(SUM(er.votes), 0),
        COUNT(DISTINCT er.polling_station_id)
    INTO v_total_votes, v_total_stations
    FROM election_results er
    WHERE er.position = p_position
    AND (
        p_region_type = 'national'
        OR (p_region_type = 'county' AND er.county_id = p_region_id)
        OR (p_region_type = 'constituency' AND er.constituency_id = p_region_id)
        OR (p_region_type = 'ward' AND er.ward_id = p_region_id)
        OR (p_region_type = 'polling_station' AND er.polling_station_id = p_region_id)
    );
    
    RETURN QUERY
    SELECT 
        c.id,
        u.full_name,
        pp.name,
        pp.abbreviation,
        pp.primary_color,
        COALESCE(SUM(er.votes), 0)::BIGINT,
        CASE 
            WHEN v_total_votes > 0 
            THEN ROUND((COALESCE(SUM(er.votes), 0)::DECIMAL / v_total_votes * 100), 2)
            ELSE 0
        END,
        COUNT(DISTINCT er.polling_station_id)::BIGINT
    FROM candidates c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN political_parties pp ON c.party_id = pp.id
    LEFT JOIN election_results er ON er.candidate_id = c.id
    WHERE c.position = p_position
    AND c.is_active = true
    AND (
        p_region_type = 'national'
        OR (p_region_type = 'county' AND er.county_id = p_region_id)
        OR (p_region_type = 'constituency' AND er.constituency_id = p_region_id)
        OR (p_region_type = 'ward' AND er.ward_id = p_region_id)
        OR (p_region_type = 'polling_station' AND er.polling_station_id = p_region_id)
    )
    GROUP BY c.id, u.full_name, pp.name, pp.abbreviation, pp.primary_color
    ORDER BY COALESCE(SUM(er.votes), 0) DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Follower Analytics Functions
-- =============================================

-- Get follower statistics for a candidate
CREATE OR REPLACE FUNCTION get_candidate_follower_stats(p_candidate_id UUID)
RETURNS TABLE (
    total_followers BIGINT,
    today_new BIGINT,
    today_unfollowed BIGINT,
    this_week_new BIGINT,
    this_month_new BIGINT,
    male_percentage DECIMAL(5, 2),
    female_percentage DECIMAL(5, 2)
) AS $$
DECLARE
    v_total BIGINT;
    v_male BIGINT;
    v_female BIGINT;
BEGIN
    -- Get total followers
    SELECT COUNT(*) INTO v_total
    FROM followers
    WHERE candidate_id = p_candidate_id AND is_following = true;
    
    -- Get gender breakdown
    SELECT 
        COUNT(*) FILTER (WHERE voter_gender = 'male'),
        COUNT(*) FILTER (WHERE voter_gender = 'female')
    INTO v_male, v_female
    FROM followers
    WHERE candidate_id = p_candidate_id AND is_following = true;
    
    RETURN QUERY
    SELECT
        v_total,
        (SELECT COUNT(*) FROM followers 
         WHERE candidate_id = p_candidate_id 
         AND is_following = true 
         AND followed_at::DATE = CURRENT_DATE),
        (SELECT COUNT(*) FROM followers 
         WHERE candidate_id = p_candidate_id 
         AND is_following = false 
         AND unfollowed_at::DATE = CURRENT_DATE),
        (SELECT COUNT(*) FROM followers 
         WHERE candidate_id = p_candidate_id 
         AND is_following = true 
         AND followed_at >= CURRENT_DATE - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM followers 
         WHERE candidate_id = p_candidate_id 
         AND is_following = true 
         AND followed_at >= CURRENT_DATE - INTERVAL '30 days'),
        CASE WHEN v_total > 0 THEN ROUND((v_male::DECIMAL / v_total * 100), 2) ELSE 0 END,
        CASE WHEN v_total > 0 THEN ROUND((v_female::DECIMAL / v_total * 100), 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Get follower breakdown by region for a candidate
CREATE OR REPLACE FUNCTION get_candidate_follower_by_region(
    p_candidate_id UUID,
    p_region_type region_type DEFAULT 'county'
)
RETURNS TABLE (
    region_id UUID,
    region_name TEXT,
    follower_count BIGINT,
    percentage DECIMAL(5, 2)
) AS $$
DECLARE
    v_total BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM followers
    WHERE candidate_id = p_candidate_id AND is_following = true;
    
    IF p_region_type = 'county' THEN
        RETURN QUERY
        SELECT 
            f.county_id,
            co.name,
            COUNT(*)::BIGINT,
            CASE WHEN v_total > 0 THEN ROUND((COUNT(*)::DECIMAL / v_total * 100), 2) ELSE 0 END
        FROM followers f
        JOIN counties co ON f.county_id = co.id
        WHERE f.candidate_id = p_candidate_id AND f.is_following = true
        GROUP BY f.county_id, co.name
        ORDER BY COUNT(*) DESC;
    ELSIF p_region_type = 'constituency' THEN
        RETURN QUERY
        SELECT 
            f.constituency_id,
            c.name,
            COUNT(*)::BIGINT,
            CASE WHEN v_total > 0 THEN ROUND((COUNT(*)::DECIMAL / v_total * 100), 2) ELSE 0 END
        FROM followers f
        JOIN constituencies c ON f.constituency_id = c.id
        WHERE f.candidate_id = p_candidate_id AND f.is_following = true
        GROUP BY f.constituency_id, c.name
        ORDER BY COUNT(*) DESC;
    ELSIF p_region_type = 'ward' THEN
        RETURN QUERY
        SELECT 
            f.ward_id,
            w.name,
            COUNT(*)::BIGINT,
            CASE WHEN v_total > 0 THEN ROUND((COUNT(*)::DECIMAL / v_total * 100), 2) ELSE 0 END
        FROM followers f
        JOIN wards w ON f.ward_id = w.id
        WHERE f.candidate_id = p_candidate_id AND f.is_following = true
        GROUP BY f.ward_id, w.name
        ORDER BY COUNT(*) DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Scheduled Jobs (pg_cron)
-- =============================================

-- Update poll statuses (run every minute)
-- SELECT cron.schedule('update-poll-status', '* * * * *', 'SELECT update_poll_status()');

-- Refresh materialized views (run every 5 minutes during active hours)
-- SELECT cron.schedule('refresh-stats', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY candidate_follower_stats');
