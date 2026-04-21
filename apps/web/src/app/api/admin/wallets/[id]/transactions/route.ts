import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/wallets/:id/transactions
 * Returns recent transactions for a wallet (admin view).
 */
export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (
      !currentUser ||
      !hasPermission(currentUser.role as Role, PERMISSIONS.WALLET_VIEW_ALL)
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Admin Wallet TX GET] error:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    const transactions = (data || []).map((t: any) => ({
      ...t,
      amount: Math.abs(Number(t.amount) || 0),
      balance_before: Number(t.balance_before) || 0,
      balance_after: Number(t.balance_after) || 0,
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('[Admin Wallet TX GET] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
