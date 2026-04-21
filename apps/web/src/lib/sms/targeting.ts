/**
 * Shared SMS targeting logic.
 *
 * Builds recipient queries based on:
 *  - the candidate's electoral position (which constrains the geographic scope)
 *  - the audience type (followers / registered voters / agents)
 *  - optional region filters (county / constituency / ward / polling station)
 *  - optional demographic filters (gender / age bracket)
 *
 * Hierarchy rules (top → down) by candidate position:
 *   - president     : nationwide → can drill to county / constituency / ward / polling_station
 *   - governor      : locked to candidate.county_id → drill to constituency / ward / polling_station
 *   - senator       : same as governor
 *   - women_rep     : same as governor
 *   - mp            : locked to candidate.constituency_id → drill to ward / polling_station
 *   - mca           : locked to candidate.ward_id → drill to polling_station
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePhoneNumber } from './airtouch';

export type AudienceType = 'followers' | 'voters' | 'agents';

export interface CandidateScope {
  id: string;
  user_id: string;
  position: 'president' | 'governor' | 'senator' | 'women_rep' | 'mp' | 'mca';
  county_id: string | null;
  constituency_id: string | null;
  ward_id: string | null;
}

export interface TargetingFilters {
  audienceType: AudienceType;
  countyId?: string | null;
  constituencyId?: string | null;
  wardId?: string | null;
  pollingStationId?: string | null;
  gender?: string | null;
  ageBracket?: string | null;
}

export interface RecipientRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  county_name: string | null;
  constituency_name: string | null;
  ward_name: string | null;
  polling_station_name: string | null;
}

/**
 * Returns the deepest geographic level a candidate is locked to.
 * Filters that try to escape this scope are silently ignored.
 */
export function getLockedScope(c: CandidateScope) {
  switch (c.position) {
    case 'mca':
      return { county_id: c.county_id, constituency_id: c.constituency_id, ward_id: c.ward_id, level: 'ward' as const };
    case 'mp':
      return { county_id: c.county_id, constituency_id: c.constituency_id, ward_id: null, level: 'constituency' as const };
    case 'governor':
    case 'senator':
    case 'women_rep':
      return { county_id: c.county_id, constituency_id: null, ward_id: null, level: 'county' as const };
    case 'president':
    default:
      return { county_id: null, constituency_id: null, ward_id: null, level: 'national' as const };
  }
}

/**
 * Merge a candidate's locked scope with user-supplied filters.
 * Locked levels always win.
 */
export function resolveRegionFilters(c: CandidateScope, f: TargetingFilters) {
  const locked = getLockedScope(c);
  return {
    county_id: locked.county_id ?? (f.countyId || null),
    constituency_id: locked.constituency_id ?? (f.constituencyId || null),
    ward_id: locked.ward_id ?? (f.wardId || null),
    polling_station_id: f.pollingStationId || null,
  };
}

/**
 * Fetch matching recipients (with details required for merge fields).
 * Returns deduplicated rows by user_id with normalized phone numbers.
 */
export async function fetchRecipients(
  supabase: SupabaseClient,
  candidate: CandidateScope,
  filters: TargetingFilters,
): Promise<RecipientRow[]> {
  const region = resolveRegionFilters(candidate, filters);

  // Common user-row selector with joined region names for merge fields
  const userSelect = `
    id,
    full_name,
    phone,
    email,
    gender,
    age_bracket,
    county:counties(name),
    constituency:constituencies(name),
    ward:wards(name),
    polling_station:polling_stations(name)
  `.replace(/\s+/g, ' ');

  let userIds: string[] | null = null;

  if (filters.audienceType === 'followers') {
    // Followers of this candidate → join users
    let q = (supabase.from('followers') as any)
      .select('voter_id')
      .eq('candidate_id', candidate.id)
      .eq('is_following', true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    userIds = (data || []).map((r: any) => r.voter_id);
    if (userIds && userIds.length === 0) return [];
  } else if (filters.audienceType === 'agents') {
    // Agents assigned to this candidate
    let q = (supabase.from('agents') as any)
      .select('user_id, assigned_polling_station_id, assigned_ward_id, assigned_constituency_id, assigned_county_id')
      .eq('candidate_id', candidate.id)
      .eq('status', 'active');

    if (region.polling_station_id) q = q.eq('assigned_polling_station_id', region.polling_station_id);
    else if (region.ward_id) q = q.eq('assigned_ward_id', region.ward_id);
    else if (region.constituency_id) q = q.eq('assigned_constituency_id', region.constituency_id);
    else if (region.county_id) q = q.eq('assigned_county_id', region.county_id);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    userIds = (data || []).map((r: any) => r.user_id);
    if (userIds && userIds.length === 0) return [];
  }
  // For 'voters' we filter directly on users with role='voter' (no preselected ids)

  // Now query users
  let uq = (supabase.from('users') as any).select(userSelect);

  if (userIds) {
    uq = uq.in('id', userIds);
  } else {
    // 'voters' path — registered voters scoped by the candidate's locked region first
    uq = uq.eq('role', 'voter');
  }

  // Apply geographic filters (for followers/voters; for agents we already filtered above
  // by their *assigned* region, but also ensure user record is in scope)
  if (region.polling_station_id) uq = uq.eq('polling_station_id', region.polling_station_id);
  else if (region.ward_id) uq = uq.eq('ward_id', region.ward_id);
  else if (region.constituency_id) uq = uq.eq('constituency_id', region.constituency_id);
  else if (region.county_id) uq = uq.eq('county_id', region.county_id);

  if (filters.gender) uq = uq.eq('gender', filters.gender);
  if (filters.ageBracket) uq = uq.eq('age_bracket', filters.ageBracket);

  const { data: users, error: uErr } = await uq;
  if (uErr) throw new Error(uErr.message);

  const seen = new Set<string>();
  const rows: RecipientRow[] = [];
  for (const u of users || []) {
    if (!u.phone || seen.has(u.id)) continue;
    seen.add(u.id);
    rows.push({
      user_id: u.id,
      full_name: u.full_name || null,
      phone: normalizePhoneNumber(u.phone),
      email: u.email || null,
      county_name: u.county?.name || null,
      constituency_name: u.constituency?.name || null,
      ward_name: u.ward?.name || null,
      polling_station_name: u.polling_station?.name || null,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Merge fields                                                        */
/* ------------------------------------------------------------------ */

export const MERGE_FIELDS: { token: string; label: string; description: string }[] = [
  { token: '{{full_name}}', label: 'Full Name', description: 'Recipient full name' },
  { token: '{{first_name}}', label: 'First Name', description: 'First word of recipient name' },
  { token: '{{phone}}', label: 'Phone', description: 'Recipient phone (E.164)' },
  { token: '{{email}}', label: 'Email', description: 'Recipient email (if any)' },
  { token: '{{county}}', label: 'County', description: 'Recipient county' },
  { token: '{{constituency}}', label: 'Constituency', description: 'Recipient constituency' },
  { token: '{{ward}}', label: 'Ward', description: 'Recipient ward' },
  { token: '{{polling_station}}', label: 'Polling Station', description: 'Recipient polling station' },
];

export function applyMergeFields(template: string, r: RecipientRow): string {
  const firstName = (r.full_name || '').trim().split(/\s+/)[0] || '';
  return template
    .replace(/\{\{\s*full_name\s*\}\}/gi, r.full_name || '')
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*phone\s*\}\}/gi, r.phone || '')
    .replace(/\{\{\s*email\s*\}\}/gi, r.email || '')
    .replace(/\{\{\s*county\s*\}\}/gi, r.county_name || '')
    .replace(/\{\{\s*constituency\s*\}\}/gi, r.constituency_name || '')
    .replace(/\{\{\s*ward\s*\}\}/gi, r.ward_name || '')
    .replace(/\{\{\s*polling_station\s*\}\}/gi, r.polling_station_name || '');
}

export function hasMergeFields(template: string): boolean {
  return /\{\{\s*(full_name|first_name|phone|email|county|constituency|ward|polling_station)\s*\}\}/i.test(template);
}
