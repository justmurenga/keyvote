import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'system_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Fetch all stats in parallel
    const [
      usersResult,
      activeUsersResult,
      verifiedUsersResult,
      roleCountsResult,
      pollsResult,
      activePollsResult,
      completedPollsResult,
      draftPollsResult,
      candidatesResult,
      activeCandidatesResult,
      verifiedCandidatesResult,
      partiesResult,
      verifiedPartiesResult,
      countiesResult,
      constituenciesResult,
      wardsResult,
      pollingStationsResult,
      walletsResult,
      frozenWalletsResult,
    ] = await Promise.all([
      adminClient.from('users').select('*', { count: 'exact', head: true }),
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      adminClient.from('users').select('role'),
      adminClient.from('polls').select('*', { count: 'exact', head: true }),
      adminClient.from('polls').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      adminClient.from('polls').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      adminClient.from('polls').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      adminClient.from('candidates').select('*', { count: 'exact', head: true }),
      adminClient.from('candidates').select('*', { count: 'exact', head: true }).eq('is_active', true),
      adminClient.from('candidates').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      adminClient.from('political_parties').select('*', { count: 'exact', head: true }),
      adminClient.from('political_parties').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      adminClient.from('counties').select('*', { count: 'exact', head: true }),
      adminClient.from('constituencies').select('*', { count: 'exact', head: true }),
      adminClient.from('wards').select('*', { count: 'exact', head: true }),
      adminClient.from('polling_stations').select('*', { count: 'exact', head: true }),
      adminClient.from('wallets').select('balance, is_frozen'),
      adminClient.from('wallets').select('*', { count: 'exact', head: true }).eq('is_frozen', true),
    ]);

    // Calculate role distribution
    const byRole: Record<string, number> = {};
    if (roleCountsResult.data) {
      for (const u of roleCountsResult.data as any[]) {
        byRole[u.role] = (byRole[u.role] || 0) + 1;
      }
    }

    // Calculate wallet totals
    let totalBalance = 0;
    if (walletsResult.data) {
      for (const w of walletsResult.data as any[]) {
        totalBalance += Number(w.balance) || 0;
      }
    }

    return NextResponse.json({
      users: {
        total: usersResult.count || 0,
        active: activeUsersResult.count || 0,
        verified: verifiedUsersResult.count || 0,
        byRole,
      },
      polls: {
        total: pollsResult.count || 0,
        active: activePollsResult.count || 0,
        completed: completedPollsResult.count || 0,
        draft: draftPollsResult.count || 0,
      },
      candidates: {
        total: candidatesResult.count || 0,
        active: activeCandidatesResult.count || 0,
        verified: verifiedCandidatesResult.count || 0,
      },
      parties: {
        total: partiesResult.count || 0,
        verified: verifiedPartiesResult.count || 0,
      },
      regions: {
        counties: countiesResult.count || 0,
        constituencies: constituenciesResult.count || 0,
        wards: wardsResult.count || 0,
        pollingStations: pollingStationsResult.count || 0,
      },
      wallets: {
        total: walletsResult.data?.length || 0,
        totalBalance,
        frozen: frozenWalletsResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
