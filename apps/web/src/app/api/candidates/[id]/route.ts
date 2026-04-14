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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const candidateId = params.id;

    // Fetch candidate with all related data
    const { data: candidate, error } = await supabase
      .from('candidates')
      .select(`
        id,
        position,
        campaign_slogan,
        manifesto_text,
        manifesto_pdf_url,
        campaign_video_url,
        facebook_url,
        twitter_url,
        instagram_url,
        tiktok_url,
        follower_count,
        is_verified,
        is_independent,
        created_at,
        party:political_parties (
          id,
          name,
          abbreviation,
          primary_color,
          secondary_color,
          symbol_url,
          leader_name
        ),
        user:users!inner (
          id,
          full_name,
          profile_photo_url,
          bio,
          gender,
          age_bracket
        ),
        county:counties (
          id,
          name,
          code
        ),
        constituency:constituencies (
          id,
          name,
          code
        ),
        ward:wards (
          id,
          name,
          code
        )
      `)
      .eq('id', candidateId)
      .eq('is_active', true)
      .single() as { data: any; error: any };

    if (error || !candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Get current user's follow status
    const { data: { user } } = await supabase.auth.getUser();
    let isFollowing = false;

    if (user) {
      const { data: follow } = await supabase
        .from('followers')
        .select('is_following')
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId)
        .single() as { data: { is_following: boolean } | null; error: any };

      isFollowing = follow?.is_following || false;
    }

    // Get follower demographics for analytics
    const { data: followerStats } = await supabase
      .from('followers')
      .select('voter_gender, voter_age_bracket, county_id')
      .eq('candidate_id', candidateId)
      .eq('is_following', true) as { data: Array<{ voter_gender: string | null; voter_age_bracket: string | null; county_id: string | null }> | null; error: any };

    // Calculate demographics
    const demographics = {
      total: followerStats?.length || 0,
      byGender: {} as Record<string, number>,
      byAge: {} as Record<string, number>,
      byCounty: {} as Record<string, number>,
    };

    followerStats?.forEach(f => {
      if (f.voter_gender) {
        demographics.byGender[f.voter_gender] = (demographics.byGender[f.voter_gender] || 0) + 1;
      }
      if (f.voter_age_bracket) {
        demographics.byAge[f.voter_age_bracket] = (demographics.byAge[f.voter_age_bracket] || 0) + 1;
      }
    });

    // Determine location
    let location = '';
    let locationDetails = null;
    if (candidate.ward) {
      location = (candidate.ward as any).name;
      locationDetails = candidate.ward;
    } else if (candidate.constituency) {
      location = (candidate.constituency as any).name;
      locationDetails = candidate.constituency;
    } else if (candidate.county) {
      location = (candidate.county as any).name;
      locationDetails = candidate.county;
    } else if (candidate.position === 'president') {
      location = 'National';
    }

    const party = candidate.party as any;
    const userData = candidate.user as any;

    return NextResponse.json({
      id: candidate.id,
      name: userData?.full_name || 'Unknown',
      position: candidate.position,
      positionLabel: POSITION_LABELS[candidate.position] || candidate.position,
      photoUrl: userData?.profile_photo_url,
      bio: userData?.bio,
      gender: userData?.gender,
      ageBracket: userData?.age_bracket,
      party: party ? {
        id: party.id,
        name: party.name,
        abbreviation: party.abbreviation,
        primaryColor: party.primary_color,
        secondaryColor: party.secondary_color,
        symbolUrl: party.symbol_url,
        leaderName: party.leader_name,
      } : null,
      isIndependent: candidate.is_independent,
      isVerified: candidate.is_verified,
      followerCount: candidate.follower_count || 0,
      isFollowing,
      location,
      locationDetails,
      slogan: candidate.campaign_slogan,
      manifesto: candidate.manifesto_text,
      manifestoPdfUrl: candidate.manifesto_pdf_url,
      videoUrl: candidate.campaign_video_url,
      socialLinks: {
        facebook: candidate.facebook_url,
        twitter: candidate.twitter_url,
        instagram: candidate.instagram_url,
        tiktok: candidate.tiktok_url,
      },
      demographics,
      joinedAt: candidate.created_at,
    });
  } catch (error) {
    console.error('Candidate detail API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
