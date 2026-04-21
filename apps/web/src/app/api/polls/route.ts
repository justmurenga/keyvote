import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import type { ElectoralPosition, PollStatus } from '@myvote/database';

const POSITION_LABELS: Record<string, string> = {
  president: 'Presidential',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Rep',
  mp: 'Member of Parliament',
  mca: 'MCA',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const position = searchParams.get('position');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query for active/completed/scheduled polls (public view)
    let query = supabase
      .from('polls')
      .select(`
        id,
        title,
        description,
        position,
        status,
        start_time,
        end_time,
        total_votes,
        county_id,
        constituency_id,
        ward_id,
        is_party_nomination,
        party:political_parties(id, name, abbreviation),
        county:counties(id, name),
        constituency:constituencies(id, name),
        ward:wards(id, name),
        created_at
      `, { count: 'exact' })
      .in('status', ['active', 'completed', 'scheduled']);

    // Filter by position
    if (position && position !== 'all') {
      query = query.eq('position', position as ElectoralPosition);
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status as PollStatus);
    }

    // Order and paginate
    query = query
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: polls, error, count } = await query as { data: any[] | null; error: any; count: number | null };

    if (error) {
      console.error('Polls fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch polls' },
        { status: 500 }
      );
    }

    // Get current user
    const currentUser = await getApiCurrentUser(supabase);
    const userId = currentUser?.id || null;
    let userVotes: Record<string, string> = {};

    if (userId) {
      const { data: votes } = await supabase
        .from('poll_votes')
        .select('poll_id, candidate_id')
        .eq('voter_id', userId) as { data: Array<{ poll_id: string; candidate_id: string }> | null; error: any };

      userVotes = (votes || []).reduce((acc, v) => {
        acc[v.poll_id] = v.candidate_id;
        return acc;
      }, {} as Record<string, string>);
    }

    // Get candidates for each poll's position and vote counts
    const formattedPolls = await Promise.all((polls || []).map(async (poll) => {
      // Get candidates for this position
      let candidatesQuery = supabase
        .from('candidates')
        .select(`
          id,
          user:users(id, full_name, profile_photo_url),
          party:political_parties(id, name, abbreviation)
        `)
        .eq('position', poll.position)
        .eq('is_active', true);

      // Filter by region if poll has regional scope
      if (poll.county_id) {
        candidatesQuery = candidatesQuery.eq('county_id', poll.county_id);
      }
      if (poll.constituency_id) {
        candidatesQuery = candidatesQuery.eq('constituency_id', poll.constituency_id);
      }
      if (poll.ward_id) {
        candidatesQuery = candidatesQuery.eq('ward_id', poll.ward_id);
      }

      const { data: candidates } = await candidatesQuery as { data: any[] | null; error: any };

      // Get vote counts for this poll
      const { data: voteData } = await supabase
        .from('poll_votes')
        .select('candidate_id')
        .eq('poll_id', poll.id) as { data: Array<{ candidate_id: string }> | null; error: any };

      const voteCounts = (voteData || []).reduce((acc, v) => {
        acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalVotes = voteData?.length || 0;

      // Format candidates as options
      const options = (candidates || []).map((c: any) => ({
        id: c.id,
        text: `${c.user?.full_name || 'Unknown'} (${c.party?.abbreviation || 'IND'})`,
        candidateName: c.user?.full_name || 'Unknown',
        party: c.party?.abbreviation || 'IND',
        avatar: c.user?.profile_photo_url,
        votes: voteCounts[c.id] || 0,
        percentage: totalVotes > 0 ? ((voteCounts[c.id] || 0) / totalVotes) * 100 : 0,
      })).sort((a: any, b: any) => b.votes - a.votes);

      return {
        id: poll.id,
        question: poll.title,
        description: poll.description,
        position: poll.position,
        positionLabel: POSITION_LABELS[poll.position] || poll.position,
        status: poll.status,
        startsAt: poll.start_time,
        endsAt: poll.end_time,
        createdAt: poll.created_at,
        totalVotes,
        hasVoted: !!userVotes[poll.id],
        userVote: userVotes[poll.id],
        options,
        isPartyNomination: poll.is_party_nomination,
        party: poll.party,
        region: poll.ward?.name
          || poll.constituency?.name
          || poll.county?.name
          || 'National',
        regionLevel: poll.ward_id
          ? 'ward'
          : poll.constituency_id
            ? 'constituency'
            : poll.county_id
              ? 'county'
              : 'national',
        county: poll.county,
        constituency: poll.constituency,
        ward: poll.ward,
      };
    }));

    return NextResponse.json({
      polls: formattedPolls,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Polls API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
