import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    const userId = currentUser?.id || null;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pollId, optionId } = body; // optionId is actually candidateId

    if (!pollId || !optionId) {
      return NextResponse.json(
        { error: 'Poll ID and candidate ID are required' },
        { status: 400 }
      );
    }

    // Eligibility gate: only users who have verified their details
    // and set their location (polling station) can participate in polls.
    const { data: voter, error: voterError } = await supabase
      .from('users')
      .select('is_verified, is_active, polling_station_id')
      .eq('id', userId)
      .single() as {
        data: { is_verified: boolean | null; is_active: boolean | null; polling_station_id: string | null } | null;
        error: any;
      };

    if (voterError || !voter) {
      return NextResponse.json(
        { error: 'Voter profile not found' },
        { status: 403 }
      );
    }

    if (voter.is_active === false) {
      return NextResponse.json(
        { error: 'Your account is not active. Please contact support.', code: 'voter_inactive' },
        { status: 403 }
      );
    }

    if (!voter.is_verified) {
      return NextResponse.json(
        {
          error: 'Please verify your account details before voting.',
          code: 'voter_not_verified',
        },
        { status: 403 }
      );
    }

    if (!voter.polling_station_id) {
      return NextResponse.json(
        {
          error: 'Please set your polling station / location in your profile before voting.',
          code: 'voter_location_missing',
        },
        { status: 403 }
      );
    }

    // Check if poll exists and is active
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, status, start_time, end_time, position')
      .eq('id', pollId)
      .single() as { data: { id: string; status: string; start_time: string; end_time: string; position: string } | null; error: any };

    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // `status` is the authoritative source of truth. Admins explicitly move a
    // poll into `active` (start immediately) regardless of the originally
    // scheduled `start_time`, so we must not second-guess that here.
    if (poll.status === 'scheduled') {
      return NextResponse.json(
        { error: 'This poll has not started yet' },
        { status: 400 }
      );
    }

    if (poll.status !== 'active') {
      return NextResponse.json(
        { error: 'This poll is not currently active' },
        { status: 400 }
      );
    }

    if (new Date(poll.end_time) < now) {
      return NextResponse.json(
        { error: 'This poll has ended' },
        { status: 400 }
      );
    }

    // Check if candidate exists and matches poll position
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, position')
      .eq('id', optionId)
      .eq('is_active', true)
      .single() as { data: { id: string; position: string } | null; error: any };

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Invalid candidate' },
        { status: 400 }
      );
    }

    if (candidate.position !== poll.position) {
      return NextResponse.json(
        { error: 'Candidate is not valid for this poll' },
        { status: 400 }
      );
    }

    // Check if user has already voted (one vote per poll enforcement)
    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('voter_id', userId)
      .single() as { data: { id: string } | null; error: any };

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted in this poll' },
        { status: 400 }
      );
    }

    // Record the vote (demographics are captured by trigger).
    // We use the admin (service-role) client because OTP-authenticated users
    // do not have a Supabase auth.uid() session, which would otherwise cause
    // the RLS INSERT policy on poll_votes to reject the row. All eligibility
    // checks have already been performed above, and the database-level
    // `enforce_voter_eligibility` trigger remains as a final safety net.
    const adminSupabase = createAdminClient();
    const { error: voteError } = await (adminSupabase as any)
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        voter_id: userId,
        candidate_id: optionId,
        vote_source: 'web',
      });

    if (voteError) {
      console.error('Vote error:', voteError);
      
      // Check for unique constraint violation (already voted)
      if (voteError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted in this poll' },
          { status: 400 }
        );
      }

      // Eligibility trigger raised a check_violation
      if (voteError.code === '23514' || /not verified|not active|polling station/i.test(voteError.message || '')) {
        return NextResponse.json(
          { error: voteError.message || 'You are not eligible to vote yet', code: voteError.hint || 'voter_ineligible' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to record vote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vote recorded successfully',
    });
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
