-- =============================================
-- Migration: 0018_voter_aggregation_views
-- Description: Create materialized views for registered voter aggregation
--              at polling station → ward → constituency → county → national levels.
--              Add trigger to auto-refresh aggregates when polling station data changes.
-- =============================================

-- =============================================
-- 1. Materialized Views for fast aggregate lookups
-- =============================================

-- Ward-level aggregate: sum of registered voters from all polling stations in a ward
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ward_voter_stats AS
SELECT
    w.id AS ward_id,
    w.code AS ward_code,
    w.name AS ward_name,
    w.constituency_id,
    COUNT(ps.id) AS polling_station_count,
    COALESCE(SUM(ps.registered_voters), 0)::BIGINT AS total_registered_voters
FROM wards w
LEFT JOIN polling_stations ps ON ps.ward_id = w.id
GROUP BY w.id, w.code, w.name, w.constituency_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ward_voter_stats_id ON mv_ward_voter_stats(ward_id);

-- Constituency-level aggregate: sum from all wards in a constituency
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_constituency_voter_stats AS
SELECT
    c.id AS constituency_id,
    c.code AS constituency_code,
    c.name AS constituency_name,
    c.county_id,
    COUNT(DISTINCT w.id) AS ward_count,
    COUNT(ps.id) AS polling_station_count,
    COALESCE(SUM(ps.registered_voters), 0)::BIGINT AS total_registered_voters
FROM constituencies c
LEFT JOIN wards w ON w.constituency_id = c.id
LEFT JOIN polling_stations ps ON ps.ward_id = w.id
GROUP BY c.id, c.code, c.name, c.county_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_constituency_voter_stats_id ON mv_constituency_voter_stats(constituency_id);

-- County-level aggregate: sum from all constituencies in a county
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_county_voter_stats AS
SELECT
    co.id AS county_id,
    co.code AS county_code,
    co.name AS county_name,
    COUNT(DISTINCT c.id) AS constituency_count,
    COUNT(DISTINCT w.id) AS ward_count,
    COUNT(ps.id) AS polling_station_count,
    COALESCE(SUM(ps.registered_voters), 0)::BIGINT AS total_registered_voters
FROM counties co
LEFT JOIN constituencies c ON c.county_id = co.id
LEFT JOIN wards w ON w.constituency_id = c.id
LEFT JOIN polling_stations ps ON ps.ward_id = w.id
GROUP BY co.id, co.code, co.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_county_voter_stats_id ON mv_county_voter_stats(county_id);

-- National-level aggregate: sum of all counties
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_national_voter_stats AS
SELECT
    COUNT(DISTINCT co.id) AS county_count,
    COUNT(DISTINCT c.id) AS constituency_count,
    COUNT(DISTINCT w.id) AS ward_count,
    COUNT(ps.id) AS polling_station_count,
    COALESCE(SUM(ps.registered_voters), 0)::BIGINT AS total_registered_voters
FROM counties co
LEFT JOIN constituencies c ON c.county_id = co.id
LEFT JOIN wards w ON w.constituency_id = c.id
LEFT JOIN polling_stations ps ON ps.ward_id = w.id;

-- =============================================
-- 2. Refresh function for all materialized views
-- =============================================
CREATE OR REPLACE FUNCTION refresh_voter_aggregation_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_voter_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_constituency_voter_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_county_voter_stats;
    REFRESH MATERIALIZED VIEW mv_national_voter_stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. Also update the denormalized registered_voters columns on base tables
-- =============================================
CREATE OR REPLACE FUNCTION sync_registered_voter_counts()
RETURNS void AS $$
BEGIN
    -- Update ward totals from polling stations
    UPDATE wards w
    SET registered_voters = sub.total,
        updated_at = NOW()
    FROM (
        SELECT ward_id, COALESCE(SUM(registered_voters), 0)::INTEGER AS total
        FROM polling_stations
        GROUP BY ward_id
    ) sub
    WHERE w.id = sub.ward_id AND w.registered_voters IS DISTINCT FROM sub.total;

    -- Update constituency totals from wards
    UPDATE constituencies c
    SET registered_voters = sub.total,
        updated_at = NOW()
    FROM (
        SELECT constituency_id, COALESCE(SUM(registered_voters), 0)::INTEGER AS total
        FROM wards
        GROUP BY constituency_id
    ) sub
    WHERE c.id = sub.constituency_id AND c.registered_voters IS DISTINCT FROM sub.total;

    -- Update county totals from constituencies
    UPDATE counties co
    SET registered_voters = sub.total,
        updated_at = NOW()
    FROM (
        SELECT county_id, COALESCE(SUM(registered_voters), 0)::INTEGER AS total
        FROM constituencies
        GROUP BY county_id
    ) sub
    WHERE co.id = sub.county_id AND co.registered_voters IS DISTINCT FROM sub.total;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. Trigger: auto-sync when polling station voters change
-- =============================================
CREATE OR REPLACE FUNCTION on_polling_station_voters_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync the denormalized counts in the hierarchy
    PERFORM sync_registered_voter_counts();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT, UPDATE of registered_voters, or DELETE on polling_stations
DROP TRIGGER IF EXISTS tr_polling_station_voters_change ON polling_stations;
CREATE TRIGGER tr_polling_station_voters_change
    AFTER INSERT OR UPDATE OF registered_voters OR DELETE ON polling_stations
    FOR EACH STATEMENT
    EXECUTE FUNCTION on_polling_station_voters_change();

-- =============================================
-- 5. Function to get complete voter stats for a user's electoral line
-- =============================================
CREATE OR REPLACE FUNCTION get_user_voter_aggregates(p_user_id UUID)
RETURNS TABLE (
    level TEXT,
    region_id UUID,
    region_name TEXT,
    registered_voters BIGINT,
    polling_station_count BIGINT,
    sub_region_count BIGINT
) AS $$
DECLARE
    v_polling_station_id UUID;
    v_ward_id UUID;
    v_constituency_id UUID;
    v_county_id UUID;
BEGIN
    -- Get user's location
    SELECT u.polling_station_id, u.ward_id, u.constituency_id, u.county_id
    INTO v_polling_station_id, v_ward_id, v_constituency_id, v_county_id
    FROM users u WHERE u.id = p_user_id;

    IF v_polling_station_id IS NULL THEN
        RETURN;
    END IF;

    -- Polling station level
    RETURN QUERY
    SELECT 
        'polling_station'::TEXT,
        ps.id,
        ps.display_name::TEXT,
        ps.registered_voters::BIGINT,
        1::BIGINT,
        0::BIGINT
    FROM polling_stations ps
    WHERE ps.id = v_polling_station_id;

    -- Ward level
    RETURN QUERY
    SELECT
        'ward'::TEXT,
        ws.ward_id,
        ws.ward_name::TEXT,
        ws.total_registered_voters,
        ws.polling_station_count,
        ws.polling_station_count  -- sub-regions = polling stations
    FROM mv_ward_voter_stats ws
    WHERE ws.ward_id = v_ward_id;

    -- Constituency level
    RETURN QUERY
    SELECT
        'constituency'::TEXT,
        cs.constituency_id,
        cs.constituency_name::TEXT,
        cs.total_registered_voters,
        cs.polling_station_count,
        cs.ward_count  -- sub-regions = wards
    FROM mv_constituency_voter_stats cs
    WHERE cs.constituency_id = v_constituency_id;

    -- County level
    RETURN QUERY
    SELECT
        'county'::TEXT,
        cvs.county_id,
        cvs.county_name::TEXT,
        cvs.total_registered_voters,
        cvs.polling_station_count,
        cvs.constituency_count  -- sub-regions = constituencies
    FROM mv_county_voter_stats cvs
    WHERE cvs.county_id = v_county_id;

    -- National level
    RETURN QUERY
    SELECT
        'national'::TEXT,
        NULL::UUID,
        'Kenya'::TEXT,
        ns.total_registered_voters,
        ns.polling_station_count,
        ns.county_count  -- sub-regions = counties
    FROM mv_national_voter_stats ns;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. Helper function for drill-down: get polling stations in a ward
-- =============================================
CREATE OR REPLACE FUNCTION get_polling_stations_by_ward(p_ward_id UUID)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    stream VARCHAR,
    display_name VARCHAR,
    reg_centre_code VARCHAR,
    reg_centre_name VARCHAR,
    registered_voters INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.code,
        ps.name,
        ps.stream,
        ps.display_name,
        ps.reg_centre_code,
        ps.reg_centre_name,
        ps.registered_voters
    FROM polling_stations ps
    WHERE ps.ward_id = p_ward_id
    ORDER BY ps.display_name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. Initial data sync - run aggregation on existing data
-- =============================================
SELECT sync_registered_voter_counts();

-- =============================================
-- Comments
-- =============================================
COMMENT ON MATERIALIZED VIEW mv_ward_voter_stats IS 'Aggregated voter counts per ward from polling stations';
COMMENT ON MATERIALIZED VIEW mv_constituency_voter_stats IS 'Aggregated voter counts per constituency from wards/polling stations';
COMMENT ON MATERIALIZED VIEW mv_county_voter_stats IS 'Aggregated voter counts per county from constituencies';
COMMENT ON MATERIALIZED VIEW mv_national_voter_stats IS 'National aggregate of all registered voters';
COMMENT ON FUNCTION refresh_voter_aggregation_views IS 'Refresh all voter aggregation materialized views';
COMMENT ON FUNCTION get_user_voter_aggregates IS 'Get voter aggregates for a user from polling station to national level';
COMMENT ON FUNCTION get_polling_stations_by_ward IS 'Get all polling stations in a ward for drill-down selection';
