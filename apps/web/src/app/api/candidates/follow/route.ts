import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth/get-user';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Resolve the current user from EITHER Supabase auth OR the OTP session cookie
    // (otherwise OTP-logged-in users get a spurious 401 and feel "logged out").
    const userId = await resolveUserId(supabase);

    if (!userId) {
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

    // Use admin client for follow writes/reads. The followers RLS policies
    // enforce voter_id = auth.uid(), which is null for OTP-session users, so
    // we authorize at the application layer (we already have userId) and
    // bypass RLS via the service-role client.
    const admin = createAdminClient();

    // Check if candidate exists
    const { data: candidate, error: candidateError } = await admin
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
    if (candidate.user_id === userId) {
      return NextResponse.json(
        { error: 'You cannot follow yourself' },
        { status: 400 }
      );
    }

    if (action === 'follow') {
      // Check if already following
      const { data: existing } = await admin
        .from('followers')
        .select('id, is_following')
        .eq('voter_id', userId)
        .eq('candidate_id', candidateId)
        .maybeSingle() as { data: { id: string; is_following: boolean } | null; error: any };

      if (existing) {
        if (existing.is_following) {
          return NextResponse.json({
            success: true,
            message: 'Already following this candidate',
            isFollowing: true,
          });
        }

        // Re-follow (update existing record)
        const { error: updateError } = await (admin as any)
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
        const { error: insertError } = await (admin as any)
          .from('followers')
          .insert({
            voter_id: userId,
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
      const { error: unfollowError } = await (admin as any)
        .from('followers')
        .update({
          is_following: false,
          unfollowed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('voter_id', userId)
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
    const userId = await resolveUserId(supabase);

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');

    if (candidateId) {
      // Check if following specific candidate
      const { data: follow } = await admin
        .from('followers')
        .select('is_following')
        .eq('voter_id', userId)
        .eq('candidate_id', candidateId)
        .maybeSingle() as { data: { is_following: boolean } | null; error: any };

      return NextResponse.json({
        isFollowing: follow?.is_following || false,
      });
    }

    // Get all followed candidates
    const { data: followRows, error: followErr } = await admin
      .from('followers')
      .select('candidate_id, followed_at, sms_notifications, whatsapp_notifications')
      .eq('voter_id', userId)
      .eq('is_following', true)
      .order('followed_at', { ascending: false }) as {
        data: Array<{
          candidate_id: string;
          followed_at: string;
          sms_notifications: boolean | null;
          whatsapp_notifications: boolean | null;
        }> | null;
        error: any;
      };

    if (followErr) {
      console.error('Get following (rows) error:', followErr);
      return NextResponse.json(
        { error: 'Failed to get followed candidates' },
        { status: 500 }
      );
    }

    const candidateIds = (followRows || []).map(r => r.candidate_id);

    if (candidateIds.length === 0) {
      return NextResponse.json({ following: [] });
    }

    const { data: candidatesData, error } = await admin
      .from('candidates')
      .select(`
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
      `)
      .in('id', candidateIds) as { data: any[] | null; error: any };

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
    const followMeta = new Map(
      (followRows || []).map(r => [r.candidate_id, r])
    );
    const formattedFollowing = (candidatesData || []).map((candidate: any) => {
      const meta = followMeta.get(candidate.id);

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
        followedAt: meta?.followed_at,
        smsNotifications: meta?.sms_notifications || false,
        whatsappNotifications: meta?.whatsapp_notifications || false,
      };
    });

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
