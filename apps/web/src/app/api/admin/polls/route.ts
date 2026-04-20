import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import type { ElectoralPosition, PollStatus } from '@myvote/database';

const POSITION_LABELS: Record<string, string> = {
  president: 'Presidential',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Representative',
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

// GET - List all polls (admin view)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await getApiCurrentUser(supabase);

    if (!admin || !['system_admin', 'admin', 'party_admin'].includes(admin.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const position = searchParams.get('position');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('polls')
      .select(`
        *,
        county:counties(id, name),
        constituency:constituencies(id, name),
        ward:wards(id, name),
        party:political_parties(id, name, abbreviation),
        creator:users!created_by(id, full_name)
      `, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status as PollStatus);
    }

    if (position && position !== 'all') {
      query = query.eq('position', position as ElectoralPosition);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: polls, error, count } = await query;

    if (error) {
      console.error('Polls fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 });
    }

    // Format polls with labels
    const pollsList = polls as any[] | null;
    const formattedPolls = pollsList?.map(poll => ({
      ...poll,
      positionLabel: POSITION_LABELS[poll.position] || poll.position,
    })) || [];

    return NextResponse.json({
      polls: formattedPolls,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Admin polls API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST - Create new poll
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!title || !position || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Title, position, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Validate times
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Validate party nomination
    if (is_party_nomination && !party_id) {
      return NextResponse.json(
        { error: 'Party ID is required for nomination polls' },
        { status: 400 }
      );
    }

    // Create poll
    const { data: poll, error } = await (supabase as any)
      .from('polls')
      .insert({
        title,
        description,
        position,
        county_id: county_id || null,
        constituency_id: constituency_id || null,
        ward_id: ward_id || null,
        start_time,
        end_time,
        is_party_nomination: is_party_nomination || false,
        party_id: party_id || null,
        status: status || 'draft',
        created_by: admin.id,
        published_at: status === 'scheduled' || status === 'active' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Poll creation error:', error);
      return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
    }

    return NextResponse.json({ poll, message: 'Poll created successfully' });
  } catch (error) {
    console.error('Create poll API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
