import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants';

// ============================================================================
// Candidates API
// ============================================================================

export interface Candidate {
  id: string;
  user_id: string;
  position: string;
  county_id: string | null;
  constituency_id: string | null;
  ward_id: string | null;
  party_id: string | null;
  is_independent: boolean;
  campaign_slogan: string | null;
  manifesto_text: string | null;
  is_verified: boolean;
  verification_status: string;
  follower_count: number;
  is_active: boolean;
  user: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
    phone: string;
  };
  party?: {
    id: string;
    name: string;
    abbreviation: string;
    logo_url: string | null;
    color: string | null;
  } | null;
}

export async function fetchCandidates(params: {
  position?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { position, search, page = 1, limit = 20 } = params;

  let query = supabase
    .from('candidates')
    .select(`
      *,
      user:users!candidates_user_id_fkey(id, full_name, first_name, last_name, profile_photo_url, phone),
      party:political_parties(id, name, abbreviation, logo_url, color)
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('follower_count', { ascending: false });

  if (position && position !== 'all') {
    query = query.eq('position', position);
  }

  if (search) {
    query = query.or(`user.full_name.ilike.%${search}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  return { candidates: data || [], total: count || 0 };
}

export async function fetchCandidateById(id: string) {
  const { data, error } = await supabase
    .from('candidates')
    .select(`
      *,
      user:users!candidates_user_id_fkey(id, full_name, first_name, last_name, profile_photo_url, phone),
      party:political_parties(id, name, abbreviation, logo_url, color)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ============================================================================
// Polls API
// ============================================================================

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  position: string;
  region_type: string;
  status: string;
  start_date: string;
  end_date: string;
  total_votes: number;
  options: PollOption[];
  user_vote?: string | null;
}

export interface PollOption {
  id: string;
  poll_id: string;
  candidate_id: string | null;
  option_text: string;
  vote_count: number;
  candidate?: {
    id: string;
    user: {
      full_name: string;
      profile_photo_url: string | null;
    };
    party?: {
      abbreviation: string;
      color: string | null;
    } | null;
  };
}

export async function fetchPolls(params: {
  position?: string;
  status?: string;
}) {
  const { position, status } = params;

  let query = supabase
    .from('polls')
    .select(`
      *,
      options:poll_options(
        *,
        candidate:candidates(
          id,
          user:users!candidates_user_id_fkey(full_name, profile_photo_url),
          party:political_parties(abbreviation, color)
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (position && position !== 'all') {
    query = query.eq('position', position);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  } else {
    query = query.in('status', ['active', 'completed']);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function votePoll(pollId: string, optionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('poll_votes')
    .insert({
      poll_id: pollId,
      option_id: optionId,
      voter_id: user.id,
    });

  if (error) throw new Error(error.message);
  return true;
}

// ============================================================================
// Results API
// ============================================================================

export interface ElectionResult {
  position: string;
  region_name: string;
  region_type: string;
  status: 'live' | 'final' | 'preliminary';
  total_votes: number;
  stations_reported: number;
  total_stations: number;
  candidates: ResultCandidate[];
}

export interface ResultCandidate {
  id: string;
  name: string;
  party: string;
  party_color: string | null;
  votes: number;
  percentage: number;
  photo_url: string | null;
}

export async function fetchResults(params: { position?: string }) {
  const response = await fetch(
    `${API_BASE_URL}/api/results?position=${params.position || 'president'}`
  );

  if (!response.ok) throw new Error('Failed to fetch results');
  const data = await response.json();
  return data.results || [];
}

// ============================================================================
// Regions API
// ============================================================================

export async function fetchCounties() {
  const { data, error } = await supabase
    .from('counties')
    .select('id, code, name')
    .order('name');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchConstituencies(countyId: string) {
  const { data, error } = await supabase
    .from('constituencies')
    .select('id, code, name')
    .eq('county_id', countyId)
    .order('name');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchWards(constituencyId: string) {
  const { data, error } = await supabase
    .from('wards')
    .select('id, code, name')
    .eq('constituency_id', constituencyId)
    .order('name');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchPollingStations(wardId: string) {
  const { data, error } = await supabase
    .from('polling_stations')
    .select('id, code, name, registered_voters')
    .eq('ward_id', wardId)
    .order('name');

  if (error) throw new Error(error.message);
  return data || [];
}

// ============================================================================
// Following API
// ============================================================================

export async function followCandidate(candidateId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('followers')
    .upsert({
      voter_id: user.id,
      candidate_id: candidateId,
      is_following: true,
      followed_at: new Date().toISOString(),
    }, {
      onConflict: 'voter_id,candidate_id',
    });

  if (error) throw new Error(error.message);
  return true;
}

export async function unfollowCandidate(candidateId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('followers')
    .update({
      is_following: false,
      unfollowed_at: new Date().toISOString(),
    })
    .eq('voter_id', user.id)
    .eq('candidate_id', candidateId);

  if (error) throw new Error(error.message);
  return true;
}

export async function fetchFollowing() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('followers')
    .select(`
      *,
      candidate:candidates(
        *,
        user:users!candidates_user_id_fkey(id, full_name, first_name, last_name, profile_photo_url),
        party:political_parties(name, abbreviation, color)
      )
    `)
    .eq('voter_id', user.id)
    .eq('is_following', true);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function isFollowingCandidate(candidateId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('followers')
    .select('is_following')
    .eq('voter_id', user.id)
    .eq('candidate_id', candidateId)
    .single();

  return data?.is_following ?? false;
}
