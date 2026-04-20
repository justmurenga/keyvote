import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import type { ElectoralPosition } from '@myvote/database';

// GET - Get single poll details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = await getApiCurrentUser(supabase);

    if (!admin || !['system_admin', 'admin', 'party_admin'].includes(admin.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: poll, error } = await supabase
      .from('polls')
      .select(`
        *,
        county:counties(id, name),
        constituency:constituencies(id, name),
        ward:wards(id, name),
        party:political_parties(id, name, abbreviation),
        creator:users!created_by(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Cast poll to the correct type
    const pollData = poll as {
      id: string;
      title: string;
      position: ElectoralPosition;
      [key: string]: any;
    };

    // Get vote statistics
    const { data: voteStats } = await supabase
      .from('poll_votes')
      .select('candidate_id')
      .eq('poll_id', id);

    // Get candidate breakdown
    const { data: candidates } = await supabase
      .from('candidates')
      .select(`
        id,
        user:users(id, full_name, profile_photo_url),
        party:political_parties(id, name, abbreviation)
      `)
      .eq('position', pollData.position)
      .eq('is_active', true) as { data: Array<{
        id: string;
        user: { id: string; full_name: string; profile_photo_url: string | null } | null;
        party: { id: string; name: string; abbreviation: string } | null;
      }> | null };

    // Count votes per candidate
    const voteStatsData = voteStats as { candidate_id: string }[] | null;
    const voteCounts = (voteStatsData || []).reduce((acc, vote) => {
      acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalVotes = voteStatsData?.length || 0;

    const candidateResults = candidates?.map(c => ({
      id: c.id,
      name: c.user?.full_name || 'Unknown',
      avatar: c.user?.profile_photo_url,
      party: c.party?.abbreviation || 'IND',
      votes: voteCounts[c.id] || 0,
      percentage: totalVotes > 0 ? ((voteCounts[c.id] || 0) / totalVotes) * 100 : 0,
    })).sort((a, b) => b.votes - a.votes) || [];

    return NextResponse.json({
      poll,
      totalVotes,
      candidateResults,
    });
  } catch (error) {
    console.error('Get poll API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// PATCH - Update poll
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = await getApiCurrentUser(supabase);

    if (!admin || !['system_admin', 'admin', 'party_admin'].includes(admin.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      position,
      county_id,
      constituency_id,
      ward_id,
      start_time,
      end_time,
      is_party_nomination,
      party_id,
      status,
    } = body;

    // Check if poll exists
    const { data: existingPoll } = await supabase
      .from('polls')
      .select('id, status, total_votes')
      .eq('id', id)
      .single() as { data: { id: string; status: string; total_votes: number } | null };

    if (!existingPoll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Don't allow editing active polls with votes
    if (existingPoll.status === 'active' && existingPoll.total_votes > 0) {
      // Only allow status change
      if (status && status !== existingPoll.status) {
        const { error } = await (supabase as any)
          .from('polls')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) {
          return NextResponse.json({ error: 'Failed to update poll status' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Poll status updated' });
      }
      
      return NextResponse.json(
        { error: 'Cannot edit active poll with votes' },
        { status: 400 }
      );
    }

    // Validate times if provided
    if (start_time && end_time) {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);

      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: any = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (position !== undefined) updates.position = position;
    if (county_id !== undefined) updates.county_id = county_id || null;
    if (constituency_id !== undefined) updates.constituency_id = constituency_id || null;
    if (ward_id !== undefined) updates.ward_id = ward_id || null;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (is_party_nomination !== undefined) updates.is_party_nomination = is_party_nomination;
    if (party_id !== undefined) updates.party_id = party_id || null;
    if (status !== undefined) {
      updates.status = status;
      if ((status === 'scheduled' || status === 'active') && !existingPoll.status.match(/scheduled|active/)) {
        updates.published_at = new Date().toISOString();
      }
    }

    const { data: poll, error } = await (supabase as any)
      .from('polls')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Poll update error:', error);
      return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 });
    }

    return NextResponse.json({ poll, message: 'Poll updated successfully' });
  } catch (error) {
    console.error('Update poll API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE - Delete poll
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = await getApiCurrentUser(supabase);

    if (!admin || !['system_admin', 'admin', 'party_admin'].includes(admin.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if poll has votes
    const { data: poll } = await supabase
      .from('polls')
      .select('id, total_votes, status')
      .eq('id', id)
      .single() as { data: { id: string; total_votes: number; status: string } | null };

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (poll.total_votes > 0) {
      return NextResponse.json(
        { error: 'Cannot delete poll with votes. Cancel it instead.' },
        { status: 400 }
      );
    }

    const { error } = await (supabase as any)
      .from('polls')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Poll deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Delete poll API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
