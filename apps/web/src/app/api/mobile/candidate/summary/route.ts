import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveMobileUserId } from '@/lib/auth/mobile-user';

const ADMIN_ROLES = ['admin', 'super_admin', 'system_admin'];

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

    let trackedUserIds: string[] = [userId];
    let pendingAssignments = 0;

    if (role === 'candidate') {
      const { data: candidate } = await adminClient
        .from('candidates')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (candidate?.id) {
        const { data: agents } = await adminClient
          .from('agents')
          .select('user_id, assigned_polling_station_id, status')
          .eq('candidate_id', candidate.id)
          .in('status', ['pending', 'active']);

        if (agents?.length) {
          trackedUserIds = [
            userId,
            ...agents.map((agent) => agent.user_id).filter(Boolean),
          ];
          pendingAssignments = agents.filter((agent) => !!agent.assigned_polling_station_id).length;
        }
      }
    } else if (role === 'agent') {
      const { count } = await adminClient
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['pending', 'active'])
        .not('assigned_polling_station_id', 'is', null);

      pendingAssignments = count || 0;
    } else if (ADMIN_ROLES.includes(role)) {
      const { count } = await adminClient
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'active'])
        .not('assigned_polling_station_id', 'is', null);

      pendingAssignments = count || 0;
    }

    const { data: submissions } = await adminClient
      .from('election_result_submissions')
      .select('id, is_verified, verification_notes, submitted_by')
      .in('submitted_by', trackedUserIds)
      .order('submitted_at', { ascending: false })
      .limit(1500);

    const submittedResults = submissions?.length || 0;
    const approvedResults = submissions?.filter((row) => row.is_verified).length || 0;
    const flaggedResults =
      submissions?.filter((row) => !row.is_verified && !!row.verification_notes).length || 0;

    return NextResponse.json({
      summary: {
        pendingAssignments,
        submittedResults,
        approvedResults,
        flaggedResults,
      },
    });
  } catch (error) {
    console.error('Mobile candidate summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
