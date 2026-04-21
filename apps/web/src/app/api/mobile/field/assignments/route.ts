import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveMobileUserId } from '@/lib/auth/mobile-user';

const ADMIN_ROLES = ['admin', 'super_admin', 'system_admin'];

function toMobileStatus(status: string): 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' {
  if (status === 'active') return 'in_progress';
  if (status === 'revoked') return 'rejected';
  return 'pending';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveMobileUserId(request, supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: user } = await adminClient
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    const role = user?.role || 'voter';

    if (!['candidate', 'agent', ...ADMIN_ROLES].includes(role)) {
      return NextResponse.json({ assignments: [] });
    }

    let query = adminClient
      .from('agents')
      .select(`
        id,
        status,
        updated_at,
        assigned_polling_station_id,
        assigned_polling_station:assigned_polling_station_id(
          id,
          code,
          display_name,
          ward:wards(
            id,
            name,
            constituency:constituencies(
              id,
              name,
              county:counties(id, name)
            )
          )
        )
      `)
      .not('assigned_polling_station_id', 'is', null)
      .in('status', ['pending', 'active'])
      .order('updated_at', { ascending: false })
      .limit(100);

    if (role === 'agent') {
      query = query.eq('user_id', userId);
    }

    if (role === 'candidate') {
      const { data: candidate } = await adminClient
        .from('candidates')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!candidate?.id) {
        return NextResponse.json({ assignments: [] });
      }

      query = query.eq('candidate_id', candidate.id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const assignments = (data || []).map((row: any) => ({
      id: row.id,
      polling_station_id: row.assigned_polling_station?.id,
      polling_station_name: row.assigned_polling_station?.display_name || 'Polling Station',
      polling_station_code: row.assigned_polling_station?.code || 'N/A',
      ward_name: row.assigned_polling_station?.ward?.name || null,
      constituency_name: row.assigned_polling_station?.ward?.constituency?.name || null,
      county_name:
        row.assigned_polling_station?.ward?.constituency?.county?.name || null,
      due_at: null,
      status: toMobileStatus(row.status),
    }));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Mobile field assignments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
