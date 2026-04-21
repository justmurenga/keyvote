import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/wallets/:id/entitlements
 * Returns the prepaid services/items the wallet's owner currently has.
 */
export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (
      !currentUser ||
      !hasPermission(currentUser.role as Role, PERMISSIONS.WALLET_VIEW_ALL)
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: walletId } = await ctx.params;
    const adminClient = createAdminClient();

    const { data: wallet, error: wErr } = await adminClient
      .from('wallets')
      .select('user_id')
      .eq('id', walletId)
      .single();
    if (wErr || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const { data, error } = await adminClient
      .from('user_entitlements')
      .select('*')
      .eq('user_id', (wallet as any).user_id)
      .order('granted_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ entitlements: [] });
    }

    return NextResponse.json({ entitlements: data || [] });
  } catch (error) {
    console.error('[Admin Wallet Entitlements GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
