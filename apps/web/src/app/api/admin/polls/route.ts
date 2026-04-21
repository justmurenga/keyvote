import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import type { ElectoralPosition, PollStatus } from '@myvote/database';

const ADMIN_ROLES = ['system_admin', 'admin', 'party_admin'] as const;
const VALID_POSITIONS = new Set([
  'president',
  'governor',
  'senator',
  'women_rep',
  'mp',
  'mca',
]);
const VALID_STATUSES = new Set(['draft', 'scheduled', 'active']);
// Don't allow scheduling more than 5 years out — protects against typos.
const MAX_FUTURE_MS = 5 * 365 * 24 * 60 * 60 * 1000;
// Minimum poll duration: 5 minutes.
const MIN_DURATION_MS = 5 * 60 * 1000;

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

    if (!admin || !ADMIN_ROLES.includes(admin.role as any)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const position = searchParams.get('position');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Use admin client so the listing is not constrained by RLS that hides
    // draft/scheduled polls from non-system_admin RBAC roles. Auth + role
    // gate has already been enforced above.
    const adminDb = createAdminClient();

    let query = adminDb
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

    if (!admin || !ADMIN_ROLES.includes(admin.role as any)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

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
    } = body as Record<string, unknown>;

    // --- Required fields ---------------------------------------------------
    if (
      typeof title !== 'string' ||
      title.trim().length < 5 ||
      typeof position !== 'string' ||
      !start_time ||
      !end_time
    ) {
      return NextResponse.json(
        { error: 'Title (min 5 chars), position, start time, and end time are required' },
        { status: 400 }
      );
    }

    if (!VALID_POSITIONS.has(position)) {
      return NextResponse.json({ error: 'Invalid electoral position' }, { status: 400 });
    }

    const requestedStatus = typeof status === 'string' && VALID_STATUSES.has(status)
      ? (status as PollStatus)
      : 'draft';

    // --- Time validation ---------------------------------------------------
    const startDate = new Date(start_time as string);
    const endDate = new Date(end_time as string);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start or end time format' },
        { status: 400 }
      );
    }

    const now = Date.now();

    // Allow a small clock-skew grace window (60s) for "active" polls so the
    // user can pick "now" without bouncing off this validator.
    if (
      requestedStatus !== 'active' &&
      requestedStatus !== 'draft' &&
      startDate.getTime() < now - 60_000
    ) {
      return NextResponse.json(
        { error: 'Start time must be in the future for scheduled polls' },
        { status: 400 }
      );
    }

    if (endDate.getTime() - startDate.getTime() < MIN_DURATION_MS) {
      return NextResponse.json(
        { error: 'Poll must run for at least 5 minutes' },
        { status: 400 }
      );
    }

    if (endDate.getTime() - now > MAX_FUTURE_MS) {
      return NextResponse.json(
        { error: 'End time cannot be more than 5 years from now' },
        { status: 400 }
      );
    }

    // --- Party nomination --------------------------------------------------
    if (is_party_nomination && !party_id) {
      return NextResponse.json(
        { error: 'Party ID is required for nomination polls' },
        { status: 400 }
      );
    }

    // --- Insert via service-role client ------------------------------------
    // The RLS policy on `polls` only grants ALL to `is_system_admin(auth.uid())`
    // which checks the new RBAC tables. Some admins (e.g. legacy `admin` /
    // `party_admin` users) authenticate via the `users.role` column but don't
    // have an active row in `user_role_assignments`, so a normal client insert
    // hits "row violates row-level security policy". Auth + role gate is
    // already enforced above, so it's safe to use the service-role client.
    const adminDb = createAdminClient();

    const { data: poll, error } = await (adminDb as any)
      .from('polls')
      .insert({
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
        position: position as ElectoralPosition,
        county_id: (county_id as string) || null,
        constituency_id: (constituency_id as string) || null,
        ward_id: (ward_id as string) || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        is_party_nomination: Boolean(is_party_nomination),
        party_id: (party_id as string) || null,
        status: requestedStatus,
        created_by: admin.id,
        published_at:
          requestedStatus === 'scheduled' || requestedStatus === 'active'
            ? new Date().toISOString()
            : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Poll creation error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create poll' },
        { status: 500 }
      );
    }

    return NextResponse.json({ poll, message: 'Poll created successfully' });
  } catch (error) {
    console.error('Create poll API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
