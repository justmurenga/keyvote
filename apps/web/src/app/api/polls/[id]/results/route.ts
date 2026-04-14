import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get poll results with regional drill-down
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const regionType = searchParams.get('region_type'); // 'county' | 'constituency'
    const regionId = searchParams.get('region_id');

    // Get poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, title, position, status')
      .eq('id', id)
      .single() as { data: { id: string; title: string; position: string; status: string } | null; error: any };

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Only show results for active or completed polls
    if (!['active', 'completed'].includes(poll.status)) {
      return NextResponse.json({ error: 'Results not available' }, { status: 403 });
    }

    // Type for vote data
    interface VoteData {
      candidate_id: string;
      county_id: number | null;
      constituency_id: number | null;
      ward_id: number | null;
      voter_gender: string | null;
      voter_age_bracket: string | null;
      county: { id: number; name: string } | null;
      constituency: { id: number; name: string } | null;
      ward: { id: number; name: string } | null;
    }

    // Build votes query with optional regional filter
    let votesQuery = supabase
      .from('poll_votes')
      .select(`
        candidate_id,
        county_id,
        constituency_id,
        ward_id,
        voter_gender,
        voter_age_bracket,
        county:counties(id, name),
        constituency:constituencies(id, name),
        ward:wards(id, name)
      `)
      .eq('poll_id', id);

    // Apply regional filter for drill-down
    if (regionType === 'county' && regionId) {
      votesQuery = votesQuery.eq('county_id', regionId);
    } else if (regionType === 'constituency' && regionId) {
      votesQuery = votesQuery.eq('constituency_id', regionId);
    }

    const { data: votes, error: votesError } = await votesQuery as { data: VoteData[] | null; error: any };

    if (votesError) {
      console.error('Votes fetch error:', votesError);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    // Get candidates for this position
    const { data: candidates } = await supabase
      .from('candidates')
      .select(`
        id,
        user:users(id, full_name, profile_photo_url),
        party:political_parties(id, name, abbreviation)
      `)
      .eq('position', poll.position)
      .eq('is_active', true) as { data: Array<{
        id: string;
        user: { id: string; full_name: string; profile_photo_url: string | null } | null;
        party: { id: string; name: string; abbreviation: string } | null;
      }> | null };

    const candidateMap = candidates?.reduce((acc, c) => {
      acc[c.id] = {
        name: c.user?.full_name || 'Unknown',
        party: c.party?.abbreviation || 'IND',
      };
      return acc;
    }, {} as Record<string, { name: string; party: string }>) || {};

    const totalVotes = votes?.length || 0;

    // Helper to format candidate results for a region
    function formatCandidateResults(
      candidateCounts: Record<string, number>,
      regionTotal: number
    ) {
      return Object.entries(candidateCounts)
        .map(([candidateId, voteCount]) => ({
          candidateId,
          name: candidateMap[candidateId]?.name || 'Unknown',
          party: candidateMap[candidateId]?.party || 'IND',
          votes: voteCount,
          percentage: regionTotal > 0 ? (voteCount / regionTotal) * 100 : 0,
        }))
        .sort((a, b) => b.votes - a.votes);
    }

    // Aggregate by county
    const countyAgg: Record<string, { name: string; total: number; candidates: Record<string, number> }> = {};
    // Aggregate by constituency
    const constituencyAgg: Record<string, { name: string; total: number; candidates: Record<string, number> }> = {};
    // Aggregate by ward
    const wardAgg: Record<string, { name: string; total: number; candidates: Record<string, number> }> = {};
    // Demographics
    const genderAgg: Record<string, number> = {};
    const ageAgg: Record<string, number> = {};

    votes?.forEach((vote) => {
      // County
      if (vote.county_id) {
        const key = String(vote.county_id);
        if (!countyAgg[key]) {
          countyAgg[key] = { name: vote.county?.name || 'Unknown', total: 0, candidates: {} };
        }
        countyAgg[key].total++;
        countyAgg[key].candidates[vote.candidate_id] = (countyAgg[key].candidates[vote.candidate_id] || 0) + 1;
      }

      // Constituency
      if (vote.constituency_id) {
        const key = String(vote.constituency_id);
        if (!constituencyAgg[key]) {
          constituencyAgg[key] = { name: vote.constituency?.name || 'Unknown', total: 0, candidates: {} };
        }
        constituencyAgg[key].total++;
        constituencyAgg[key].candidates[vote.candidate_id] = (constituencyAgg[key].candidates[vote.candidate_id] || 0) + 1;
      }

      // Ward
      if (vote.ward_id) {
        const key = String(vote.ward_id);
        if (!wardAgg[key]) {
          wardAgg[key] = { name: vote.ward?.name || 'Unknown', total: 0, candidates: {} };
        }
        wardAgg[key].total++;
        wardAgg[key].candidates[vote.candidate_id] = (wardAgg[key].candidates[vote.candidate_id] || 0) + 1;
      }

      // Gender
      if (vote.voter_gender) {
        genderAgg[vote.voter_gender] = (genderAgg[vote.voter_gender] || 0) + 1;
      }

      // Age
      if (vote.voter_age_bracket) {
        ageAgg[vote.voter_age_bracket] = (ageAgg[vote.voter_age_bracket] || 0) + 1;
      }
    });

    // Format results
    const byCounty = Object.entries(countyAgg)
      .map(([id, data]) => ({
        regionId: id,
        regionName: data.name,
        totalVotes: data.total,
        candidates: formatCandidateResults(data.candidates, data.total),
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes);

    const byConstituency = Object.entries(constituencyAgg)
      .map(([id, data]) => ({
        regionId: id,
        regionName: data.name,
        totalVotes: data.total,
        candidates: formatCandidateResults(data.candidates, data.total),
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes);

    const byWard = Object.entries(wardAgg)
      .map(([id, data]) => ({
        regionId: id,
        regionName: data.name,
        totalVotes: data.total,
        candidates: formatCandidateResults(data.candidates, data.total),
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes);

    return NextResponse.json({
      pollId: poll.id,
      pollTitle: poll.title,
      totalVotes,
      byCounty,
      byConstituency,
      byWard,
      byGender: Object.entries(genderAgg).map(([gender, voteCount]) => ({
        gender,
        votes: voteCount,
        percentage: totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0,
      })),
      byAge: Object.entries(ageAgg).map(([age, voteCount]) => ({
        age,
        votes: voteCount,
        percentage: totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0,
      })),
    });
  } catch (error) {
    console.error('Poll results API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
