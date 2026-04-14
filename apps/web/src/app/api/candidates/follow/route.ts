import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { candidateId, action } = body;

    if (!candidateId || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Check if candidate exists
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, user_id')
      .eq('id', candidateId)
      .single() as { data: { id: string; user_id: string } | null; error: any };

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Users cannot follow themselves
    if (candidate.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot follow yourself' },
        { status: 400 }
      );
    }

    if (action === 'follow') {
      // Check if already following
      const { data: existing } = await supabase
        .from('followers')
        .select('id, is_following')
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId)
        .single() as { data: { id: string; is_following: boolean } | null; error: any };

      if (existing) {
        if (existing.is_following) {
          return NextResponse.json({
            success: true,
            message: 'Already following this candidate',
            isFollowing: true,
          });
        }

        // Re-follow (update existing record)
        const { error: updateError } = await (supabase as any)
          .from('followers')
          .update({
            is_following: true,
            followed_at: new Date().toISOString(),
            unfollowed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Update follow error:', updateError);
          return NextResponse.json(
            { error: 'Failed to follow candidate' },
            { status: 500 }
          );
        }
      } else {
        // Create new follow record
        const { error: insertError } = await (supabase as any)
          .from('followers')
          .insert({
            voter_id: user.id,
            candidate_id: candidateId,
            is_following: true,
          });

        if (insertError) {
          console.error('Insert follow error:', insertError);
          return NextResponse.json(
            { error: 'Failed to follow candidate' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Now following candidate',
        isFollowing: true,
      });
    } else {
      // Unfollow
      const { error: unfollowError } = await (supabase as any)
        .from('followers')
        .update({
          is_following: false,
          unfollowed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId);

      if (unfollowError) {
        console.error('Unfollow error:', unfollowError);
        return NextResponse.json(
          { error: 'Failed to unfollow candidate' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Unfollowed candidate',
        isFollowing: false,
      });
    }
  } catch (error) {
    console.error('Follow API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');

    if (candidateId) {
      // Check if following specific candidate
      const { data: follow } = await supabase
        .from('followers')
        .select('is_following')
        .eq('voter_id', user.id)
        .eq('candidate_id', candidateId)
        .single() as { data: { is_following: boolean } | null; error: any };

      return NextResponse.json({
        isFollowing: follow?.is_following || false,
      });
    }

    // Get all followed candidates
    const { data: following, error } = await supabase
      .from('followers')
      .select(`
        candidate_id,
        followed_at,
        sms_notifications,
        whatsapp_notifications,
        candidate:candidates (
          id,
          position,
          campaign_slogan,
          follower_count,
          is_verified,
          is_independent,
          county:counties (name),
          constituency:constituencies (name),
          ward:wards (name),
          party:political_parties (
            name,
            abbreviation,
            primary_color
          ),
          user:users (
            full_name,
            profile_photo_url
          )
        )
      `)
      .eq('voter_id', user.id)
      .eq('is_following', true)
      .order('followed_at', { ascending: false }) as { data: any[] | null; error: any };

    if (error) {
      console.error('Get following error:', error);
      return NextResponse.json(
        { error: 'Failed to get followed candidates' },
        { status: 500 }
      );
    }

    const POSITION_LABELS: Record<string, string> = {
      president: 'President',
      governor: 'Governor',
      senator: 'Senator',
      women_rep: 'Women Rep',
      mp: 'Member of Parliament',
      mca: 'MCA',
    };

    // Format response
    const formattedFollowing = following?.map(f => {
      const candidate = f.candidate as any;
      if (!candidate) return null;

      // Determine location
      let location = '';
      if (candidate.ward) {
        location = candidate.ward.name;
      } else if (candidate.constituency) {
        location = candidate.constituency.name;
      } else if (candidate.county) {
        location = candidate.county.name;
      } else if (candidate.position === 'president') {
        location = 'National';
      }

      return {
        id: candidate.id,
        name: candidate.user?.full_name || 'Unknown',
        position: candidate.position,
        positionLabel: POSITION_LABELS[candidate.position] || candidate.position,
        photoUrl: candidate.user?.profile_photo_url,
        partyName: candidate.party?.name,
        partyAbbreviation: candidate.party?.abbreviation,
        partyColor: candidate.party?.primary_color,
        isIndependent: candidate.is_independent,
        isVerified: candidate.is_verified,
        followerCount: candidate.follower_count || 0,
        location,
        slogan: candidate.campaign_slogan,
        followedAt: f.followed_at,
        smsNotifications: f.sms_notifications || false,
        whatsappNotifications: f.whatsapp_notifications || false,
      };
    }).filter(Boolean) || [];

    return NextResponse.json({
      following: formattedFollowing,
    });
  } catch (error) {
    console.error('Follow GET API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
