import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';

/**
 * GET /api/admin/wallets
 * List wallets (admin) with pagination, search, status filter, and aggregate stats.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (
      !currentUser ||
      !hasPermission(currentUser.role as Role, PERMISSIONS.WALLET_VIEW_ALL)
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Aggregate stats (across all wallets)
    const { data: allWallets } = await adminClient
      .from('wallets')
      .select('balance, total_credited, total_debited, is_frozen');

    const stats = {
      totalWallets: allWallets?.length || 0,
      totalBalance: 0,
      totalCredited: 0,
      totalDebited: 0,
      frozenCount: 0,
    };
    for (const w of (allWallets as any[]) || []) {
      stats.totalBalance += Number(w.balance) || 0;
      stats.totalCredited += Number(w.total_credited) || 0;
      stats.totalDebited += Number(w.total_debited) || 0;
      if (w.is_frozen) stats.frozenCount += 1;
    }

    // Build user filter for search (we need to filter wallets by user attributes)
    let userIdFilter: string[] | null = null;
    if (search) {
      const { data: matchedUsers } = await adminClient
        .from('users')
        .select('id')
        .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(500);
      userIdFilter = (matchedUsers || []).map((u: any) => u.id);
      if (userIdFilter.length === 0) {
        return NextResponse.json({
          wallets: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          stats,
        });
      }
    }

    let query = adminClient
      .from('wallets')
      .select(
        `id, user_id, balance, currency, is_active, is_frozen, frozen_reason,
         total_credited, total_debited, created_at,
         user:users!wallets_user_id_fkey(full_name, phone, email, role)`,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (status === 'active') query = query.eq('is_active', true).eq('is_frozen', false);
    else if (status === 'frozen') query = query.eq('is_frozen', true);
    else if (status === 'inactive') query = query.eq('is_active', false);

    if (userIdFilter) query = query.in('user_id', userIdFilter);

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
      console.error('[Admin Wallets GET] error:', error);
      return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
    }

    // Normalize: Supabase returns user as array for to-one foreign key in some cases
    const wallets = (data || []).map((w: any) => ({
      ...w,
      balance: Number(w.balance) || 0,
      total_credited: Number(w.total_credited) || 0,
      total_debited: Number(w.total_debited) || 0,
      user: Array.isArray(w.user) ? w.user[0] : w.user,
    }));

    return NextResponse.json({
      wallets,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (error) {
    console.error('[Admin Wallets GET] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
