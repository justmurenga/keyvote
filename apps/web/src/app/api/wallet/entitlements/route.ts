import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { chargeWalletForItem } from '@/lib/wallet';
import { getBillableItems } from '@/lib/billable-items';

/**
 * GET /api/wallet/entitlements
 * List active entitlements for the current user, plus the catalog of items
 * they are allowed to purchase based on their role.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createAdminClient();

    // Resolve role for catalog filtering
    const { data: userRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    const role = (userRow as any)?.role || 'voter';

    const items = await getBillableItems();
    const catalog = items.filter(
      (i) =>
        i.is_active !== false &&
        (!i.roles || i.roles.length === 0 || i.roles.includes(role)),
    );

    const { data, error } = await adminClient
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('[Entitlements GET] error:', error);
      return NextResponse.json({ error: 'Failed to load entitlements' }, { status: 500 });
    }

    return NextResponse.json({ entitlements: data || [], catalog, role });
  } catch (error) {
    console.error('[Entitlements GET] unexpected:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/wallet/entitlements
 * Purchase a billable item using wallet balance (prepaid). Debits the wallet
 * and grants an entitlement that the user can later view / consume.
 *
 * Body: { itemId: string, quantity?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const itemId = String(body?.itemId || '').trim();
    const purchaseQty = Math.max(1, Math.min(50, parseInt(String(body?.quantity ?? '1'))));

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // Role-based access enforcement (still done here so we can return
    // a clear 403 before touching the wallet).
    const adminClient = createAdminClient();
    const items = await getBillableItems();
    const item = items.find((i) => i.id === itemId && i.is_active !== false);
    if (!item) {
      return NextResponse.json({ error: 'Billable item not found or inactive' }, { status: 404 });
    }
    const { data: userRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    const role = (userRow as any)?.role || 'voter';
    if (item.roles && item.roles.length > 0 && !item.roles.includes(role)) {
      return NextResponse.json(
        {
          error: `This service is not available for your account type (${role}).`,
          allowed_roles: item.roles,
        },
        { status: 403 },
      );
    }

    // Delegate to the unified wallet helper so every billable item in
    // myVote is paid from the same wallet, with the same transaction
    // type rules and the same entitlement grant logic.
    try {
      const result = await chargeWalletForItem(userId, itemId, {
        quantity: purchaseQty,
        description: `Purchased: ${item.name}${purchaseQty > 1 ? ` x${purchaseQty}` : ''}`,
        reference: `entitlement-${itemId}-${Date.now()}`,
        metadata: { source: 'entitlement_purchase' },
        grantEntitlement: true,
      });

      // Return the freshly inserted entitlement row for client convenience.
      let entitlement: unknown = null;
      if (result.entitlementId) {
        const { data } = await adminClient
          .from('user_entitlements')
          .select('*')
          .eq('id', result.entitlementId)
          .single();
        entitlement = data;
      }

      return NextResponse.json({
        success: true,
        entitlement,
        transactionId: result.transactionId,
        charged: result.charged,
      });
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_FUNDS') {
        return NextResponse.json(
          {
            error: 'Insufficient wallet balance',
            required: err.required,
            available: err.available,
          },
          { status: 402 },
        );
      }
      if (err?.message === 'Wallet is frozen') {
        return NextResponse.json({ error: 'Wallet is frozen' }, { status: 403 });
      }
      throw err;
    }
  } catch (error) {
    console.error('[Entitlements POST] unexpected:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
