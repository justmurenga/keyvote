import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/wallets/:id
 * Freeze / unfreeze / activate / deactivate a wallet.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext) {
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
    const body = await request.json();
    const { is_frozen, frozen_reason, is_active } = body as {
      is_frozen?: boolean;
      frozen_reason?: string | null;
      is_active?: boolean;
    };

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof is_frozen === 'boolean') {
      update.is_frozen = is_frozen;
      update.frozen_reason = is_frozen ? frozen_reason || 'Frozen by administrator' : null;
    }
    if (typeof is_active === 'boolean') update.is_active = is_active;

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('wallets')
      .update(update as any)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Admin Wallet PATCH] error:', error);
      return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
    }

    return NextResponse.json({ wallet: data });
  } catch (error) {
    console.error('[Admin Wallet PATCH] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
