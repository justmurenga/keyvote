// Helpers to expand a hierarchical region filter (county → constituency → ward
// → polling_station) into the full set of region IDs at *every* level so we
// can match agents (or other resources) regardless of the level at which they
// were assigned.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface RegionScope {
  countyIds: string[];
  constituencyIds: string[];
  wardIds: string[];
  pollingStationIds: string[];
}

/**
 * Resolve the most specific filter the caller provided into the full set of
 * descendant IDs at every region level.
 *
 *   pollingStationId provided  → exact match only
 *   wardId           provided  → ward + every polling station inside it
 *   constituencyId   provided  → constituency + wards + polling stations
 *   countyId         provided  → county + constituencies + wards + polling stations
 *   nothing                    → empty arrays (caller should treat as no filter)
 */
export async function resolveRegionScope(
  supabase: SupabaseClient<any, any, any>,
  filter: {
    countyId?: string;
    constituencyId?: string;
    wardId?: string;
    pollingStationId?: string;
  },
): Promise<RegionScope> {
  const scope: RegionScope = {
    countyIds: [],
    constituencyIds: [],
    wardIds: [],
    pollingStationIds: [],
  };

  if (filter.pollingStationId) {
    scope.pollingStationIds = [filter.pollingStationId];
    return scope;
  }

  if (filter.wardId) {
    scope.wardIds = [filter.wardId];
    const { data: ps } = await supabase
      .from('polling_stations')
      .select('id')
      .eq('ward_id', filter.wardId);
    scope.pollingStationIds = (ps || []).map((p: any) => p.id);
    return scope;
  }

  if (filter.constituencyId) {
    scope.constituencyIds = [filter.constituencyId];
    const { data: wards } = await supabase
      .from('wards')
      .select('id')
      .eq('constituency_id', filter.constituencyId);
    scope.wardIds = (wards || []).map((w: any) => w.id);
    if (scope.wardIds.length > 0) {
      const { data: ps } = await supabase
        .from('polling_stations')
        .select('id')
        .in('ward_id', scope.wardIds);
      scope.pollingStationIds = (ps || []).map((p: any) => p.id);
    }
    return scope;
  }

  if (filter.countyId) {
    scope.countyIds = [filter.countyId];
    const { data: cons } = await supabase
      .from('constituencies')
      .select('id')
      .eq('county_id', filter.countyId);
    scope.constituencyIds = (cons || []).map((c: any) => c.id);
    if (scope.constituencyIds.length > 0) {
      const { data: wards } = await supabase
        .from('wards')
        .select('id')
        .in('constituency_id', scope.constituencyIds);
      scope.wardIds = (wards || []).map((w: any) => w.id);
      if (scope.wardIds.length > 0) {
        const { data: ps } = await supabase
          .from('polling_stations')
          .select('id')
          .in('ward_id', scope.wardIds);
        scope.pollingStationIds = (ps || []).map((p: any) => p.id);
      }
    }
    return scope;
  }

  return scope;
}

/**
 * Build a Postgrest `.or()` clause that matches any agent whose
 * `assigned_*_id` falls inside the resolved region scope. Returns null when
 * the scope is empty (caller should skip the filter entirely).
 */
export function agentRegionOrClause(scope: RegionScope): string | null {
  const parts: string[] = [];
  if (scope.pollingStationIds.length > 0) {
    parts.push(`assigned_polling_station_id.in.(${scope.pollingStationIds.join(',')})`);
  }
  if (scope.wardIds.length > 0) {
    parts.push(`assigned_ward_id.in.(${scope.wardIds.join(',')})`);
  }
  if (scope.constituencyIds.length > 0) {
    parts.push(`assigned_constituency_id.in.(${scope.constituencyIds.join(',')})`);
  }
  if (scope.countyIds.length > 0) {
    parts.push(`assigned_county_id.in.(${scope.countyIds.join(',')})`);
  }
  return parts.length ? parts.join(',') : null;
}

/**
 * Same as above but for users (home region columns).
 */
export function userRegionOrClause(scope: RegionScope): string | null {
  const parts: string[] = [];
  if (scope.pollingStationIds.length > 0) {
    parts.push(`polling_station_id.in.(${scope.pollingStationIds.join(',')})`);
  }
  if (scope.wardIds.length > 0) {
    parts.push(`ward_id.in.(${scope.wardIds.join(',')})`);
  }
  if (scope.constituencyIds.length > 0) {
    parts.push(`constituency_id.in.(${scope.constituencyIds.join(',')})`);
  }
  if (scope.countyIds.length > 0) {
    parts.push(`county_id.in.(${scope.countyIds.join(',')})`);
  }
  return parts.length ? parts.join(',') : null;
}
