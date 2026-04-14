import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    if (poll.status !== 'active') {
      return NextResponse.json(
        { error: 'This poll is not currently active' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (new Date(poll.start_time) > now) {
      return NextResponse.json(
        { error: 'This poll has not started yet' },
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

    // Record the vote (demographics are captured by trigger)
    const { error: voteError } = await (supabase as any)
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
