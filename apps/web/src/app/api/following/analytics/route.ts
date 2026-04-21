import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth/get-user';

interface CandidateRow {
  id: string;
  position: string;
  follower_count: number | null;
  is_independent: boolean | null;
  county_id: string | null;
  constituency_id: string | null;
  ward_id: string | null;
  user: { full_name: string | null; profile_photo_url: string | null } | null;
  party: { name: string | null; abbreviation: string | null; primary_color: string | null } | null;
}

/**
 * GET /api/following/analytics
 *
 * Returns analytics for each candidate the current user follows:
 *   - The candidate's own follower count
 *   - Their rank (by followers) inside their own race (same position + region)
 *   - The race average + leader info
 *   - Aggregate poll standing across opinion polls they appear in
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Get the candidates the user follows
    const { data: followRows } = await admin
      .from('followers')
      .select('candidate_id')
      .eq('voter_id', userId)
      .eq('is_following', true) as {
        data: Array<{ candidate_id: string }> | null;
        error: any;
      };

    const followedIds = (followRows || []).map((r) => r.candidate_id);
    if (followedIds.length === 0) {
      return NextResponse.json({ analytics: [] });
    }

    const { data: followed } = await admin
      .from('candidates')
      .select(`
        id, position, follower_count, is_independent,
        county_id, constituency_id, ward_id,
        user:users(full_name, profile_photo_url),
        party:political_parties(name, abbreviation, primary_color)
      `)
      .in('id', followedIds) as { data: CandidateRow[] | null; error: any };

    if (!followed || followed.length === 0) {
      return NextResponse.json({ analytics: [] });
    }

    // 2. For each followed candidate, find peers (same position + region)
    const analytics = await Promise.all(
      followed.map(async (c) => {
        // Build a peer query scoped to the same race
        let peerQ = admin
          .from('candidates')
          .select('id, follower_count, user:users(full_name)')
          .eq('position', c.position as any)
          .eq('is_active', true);
        if (c.ward_id) peerQ = peerQ.eq('ward_id', c.ward_id);
        else if (c.constituency_id) peerQ = peerQ.eq('constituency_id', c.constituency_id);
        else if (c.county_id) peerQ = peerQ.eq('county_id', c.county_id);

        const { data: peers } = await peerQ as {
          data: Array<{ id: string; follower_count: number | null; user: { full_name: string | null } | null }> | null;
          error: any;
        };

        const sortedPeers = (peers || [])
          .map((p) => ({
            id: p.id,
            name: p.user?.full_name || 'Unknown',
            followers: p.follower_count || 0,
          }))
          .sort((a, b) => b.followers - a.followers);

        const rank = sortedPeers.findIndex((p) => p.id === c.id);
        const total = sortedPeers.length;
        const leader = sortedPeers[0] || null;
        const avg =
          sortedPeers.length > 0
            ? sortedPeers.reduce((s, p) => s + p.followers, 0) / sortedPeers.length
            : 0;

        // 3. Poll standing — aggregate votes across all polls the candidate appears in
        const { data: votes } = await admin
          .from('poll_votes')
          .select('poll_id, candidate_id')
          .in('poll_id', []) as any;
        // Instead: get polls for this position & region, then total votes per candidate
        let pollsQ = admin
          .from('polls')
          .select('id')
          .eq('position', c.position as any);
        if (c.ward_id) pollsQ = pollsQ.eq('ward_id', c.ward_id);
        else if (c.constituency_id) pollsQ = pollsQ.eq('constituency_id', c.constituency_id);
        else if (c.county_id) pollsQ = pollsQ.eq('county_id', c.county_id);
        const { data: polls } = await pollsQ as { data: Array<{ id: string }> | null; error: any };
        const pollIds = (polls || []).map((p) => p.id);

        let pollVotes = 0;
        let pollTotal = 0;
        if (pollIds.length > 0) {
          const { data: pv } = await admin
            .from('poll_votes')
            .select('candidate_id')
            .in('poll_id', pollIds) as { data: Array<{ candidate_id: string }> | null; error: any };
          for (const v of pv || []) {
            pollTotal++;
            if (v.candidate_id === c.id) pollVotes++;
          }
        }

        return {
          candidateId: c.id,
          name: c.user?.full_name || 'Unknown',
          photoUrl: c.user?.profile_photo_url,
          position: c.position,
          partyAbbreviation: c.party?.abbreviation,
          partyColor: c.party?.primary_color,
          followers: c.follower_count || 0,
          followerRank: rank >= 0 ? rank + 1 : null,
          peerCount: total,
          raceAverageFollowers: Math.round(avg),
          leader: leader && leader.id !== c.id
            ? { name: leader.name, followers: leader.followers }
            : null,
          poll: {
            votes: pollVotes,
            total: pollTotal,
            sharePct: pollTotal > 0 ? (pollVotes / pollTotal) * 100 : 0,
          },
        };
      }),
    );

    return NextResponse.json({ analytics });
  } catch (err) {
    console.error('[following/analytics] error', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
