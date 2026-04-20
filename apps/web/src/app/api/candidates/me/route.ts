import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';

// GET /api/candidates/me - Get current user's candidate profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get candidate profile
    const { data: candidate, error } = await (adminClient
      .from('candidates') as any)
      .select(`
        *,
        user:users!candidates_user_id_fkey(full_name, phone, email, profile_photo_url, gender, age_bracket),
        party:political_parties(id, name, abbreviation, symbol_url, primary_color),
        county:counties(id, name),
        constituency:constituencies(id, name),
        ward:wards(id, name)
      `)
      .eq('user_id', currentUser.id)
      .single();

    if (error || !candidate) {
      return NextResponse.json({ error: 'No candidate profile found' }, { status: 404 });
    }

    const candidateData = candidate as any;

    // Get follower count with demographics
    const { count: followerCount } = await adminClient
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', candidateData.id)
      .eq('is_following', true);

    // Get follower demographics
    const { data: followers } = await (adminClient
      .from('followers') as any)
      .select('voter:users!followers_voter_id_fkey(gender, age_bracket, county_id)')
      .eq('candidate_id', candidateData.id)
      .eq('is_following', true);

    const genderBreakdown: Record<string, number> = {};
    const ageBreakdown: Record<string, number> = {};

    followers?.forEach((f: any) => {
      if (f.voter?.gender) {
        genderBreakdown[f.voter.gender] = (genderBreakdown[f.voter.gender] || 0) + 1;
      }
      if (f.voter?.age_bracket) {
        ageBreakdown[f.voter.age_bracket] = (ageBreakdown[f.voter.age_bracket] || 0) + 1;
      }
    });

    // Get agent count
    const { count: agentCount } = await adminClient
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', candidateData.id)
      .eq('status', 'active');

    // Get active polls for this candidate's position/region
    let pollsQuery = adminClient
      .from('polls')
      .select('*', { count: 'exact', head: true })
      .eq('position', candidateData.position)
      .eq('status', 'active');

    if (candidateData.county_id) pollsQuery = pollsQuery.eq('county_id', candidateData.county_id);
    if (candidateData.constituency_id) pollsQuery = pollsQuery.eq('constituency_id', candidateData.constituency_id);
    if (candidateData.ward_id) pollsQuery = pollsQuery.eq('ward_id', candidateData.ward_id);

    const { count: activePollCount } = await pollsQuery;

    // Get recent poll results for this candidate
    const { data: recentPollVotes } = await adminClient
      .from('poll_votes')
      .select('poll_id, created_at')
      .eq('candidate_id', candidateData.id)
      .order('created_at', { ascending: false })
      .limit(100);

    return NextResponse.json({
      candidate: candidateData,
      stats: {
        followerCount: followerCount || 0,
        agentCount: agentCount || 0,
        activePollCount: activePollCount || 0,
        recentVotes: recentPollVotes?.length || 0,
      },
      demographics: {
        gender: genderBreakdown,
        age: ageBreakdown,
      },
    });
  } catch (error) {
    console.error('Get candidate profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/candidates/me - Update own candidate profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check user is a candidate
    const { data: existing } = await (adminClient
      .from('candidates') as any)
      .select('id')
      .eq('user_id', currentUser.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'No candidate profile found' }, { status: 404 });
    }

    const existingData = existing as any;

    const body = await request.json();
    const allowedFields = [
      'campaign_slogan',
      'manifesto_text',
      'manifesto_pdf_url',
      'campaign_video_url',
      'facebook_url',
      'twitter_url',
      'instagram_url',
      'tiktok_url',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: candidate, error } = await (adminClient
      .from('candidates') as any)
      .update(updates)
      .eq('id', existingData.id)
      .select(`
        *,
        user:users!candidates_user_id_fkey(full_name, phone, email, profile_photo_url),
        party:political_parties(id, name, abbreviation),
        county:counties(name),
        constituency:constituencies(name),
        ward:wards(name)
      `)
      .single();

    if (error) {
      console.error('Candidate update error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ candidate, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Candidate profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
