import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
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
    const countyId = searchParams.get('countyId');
    const constituencyId = searchParams.get('constituencyId');
    const wardId = searchParams.get('wardId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('candidates')
      .select(`
        id,
        position,
        campaign_slogan,
        follower_count,
        is_verified,
        is_independent,
        county_id,
        constituency_id,
        ward_id,
        party:political_parties (
          id,
          name,
          abbreviation,
          primary_color,
          symbol_url
        ),
        user:users!inner (
          id,
          full_name,
          profile_photo_url
        ),
        county:counties (
          id,
          name
        ),
        constituency:constituencies (
          id,
          name
        ),
        ward:wards (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('is_active', true);

    // Filter by position
    if (position && position !== 'all') {
      query = query.eq('position', position);
    }

    // Filter by location based on position
    if (countyId) {
      query = query.eq('county_id', countyId);
    }
    if (constituencyId) {
      query = query.eq('constituency_id', constituencyId);
    }
    if (wardId) {
      query = query.eq('ward_id', wardId);
    }

    // Search by name
    if (search) {
      query = query.ilike('user.full_name', `%${search}%`);
    }

    // Order by follower count
    query = query
      .order('follower_count', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: candidates, error, count } = await query as { data: any[] | null; error: any; count: number | null };

    if (error) {
      console.error('Candidates fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    // Get current user's follows
    const { data: { user } } = await supabase.auth.getUser();
    let followedIds: string[] = [];

    if (user) {
      const { data: follows } = await supabase
        .from('followers')
        .select('candidate_id')
        .eq('voter_id', user.id)
        .eq('is_following', true) as { data: Array<{ candidate_id: string }> | null; error: any };

      followedIds = follows?.map(f => f.candidate_id) || [];
    }

    // Format response
    const formattedCandidates = candidates?.map(candidate => {
      // Determine location string
      let location = '';
      if (candidate.ward) {
        location = (candidate.ward as any).name;
      } else if (candidate.constituency) {
        location = (candidate.constituency as any).name;
      } else if (candidate.county) {
        location = (candidate.county as any).name;
      } else if (candidate.position === 'president') {
        location = 'National';
      }

      const party = candidate.party as any;
      const userData = candidate.user as any;

      return {
        id: candidate.id,
        name: userData?.full_name || 'Unknown',
        position: candidate.position,
        positionLabel: POSITION_LABELS[candidate.position] || candidate.position,
        photoUrl: userData?.profile_photo_url,
        partyName: party?.name,
        partyAbbreviation: party?.abbreviation,
        partyColor: party?.primary_color,
        isIndependent: candidate.is_independent,
        isVerified: candidate.is_verified,
        followerCount: candidate.follower_count || 0,
        isFollowing: followedIds.includes(candidate.id),
        location,
        slogan: candidate.campaign_slogan,
      };
    }) || [];

    return NextResponse.json({
      candidates: formattedCandidates,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Candidates API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
