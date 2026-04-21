import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveUserId } from '@/lib/auth';
import { chargeWalletForItem } from '@/lib/wallet';
import { getBillableItems } from '@/lib/billable-items';

/**
 * Legacy "service types" the older mobile clients still pass. We map
 * them 1:1 to billable item ids so they keep working while everything
 * actually goes through the unified billable-items catalog.
 */
const LEGACY_SERVICE_TO_ITEM_ID: Record<string, string> = {
  sms: 'sms',
  whatsapp: 'whatsapp',
  poll_view: 'poll_view',
  result_view: 'result_view',
  subscription: 'subscription',
};

/**
 * POST /api/wallet/charge
 *
 * Body: { serviceType: string, reference?: string, customDescription?: string }
 *
 * Charges the user's wallet for a billable item from the unified
 * `billable_items` catalog. All voter / candidate / agent payments go
 * through the same wallet via {@link chargeWalletForItem}.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serviceType, reference, customDescription } = body || {};

    const itemId =
      typeof serviceType === 'string'
        ? (LEGACY_SERVICE_TO_ITEM_ID[serviceType] || serviceType)
        : '';

    if (!itemId) {
      const items = await getBillableItems();
      return NextResponse.json(
        {
          error: 'Invalid service type',
          validTypes: items.filter((i) => i.is_active !== false).map((i) => i.id),
        },
        { status: 400 },
      );
    }

    try {
      const result = await chargeWalletForItem(userId, itemId, {
        description: customDescription,
        reference,
        metadata: { source: 'wallet_charge' },
        grantEntitlement: true,
      });
      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
        charged: result.charged,
        service: result.item.id,
        description: customDescription || result.item.name,
      });
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_FUNDS') {
        return NextResponse.json(
          {
            error: 'Insufficient wallet balance',
            required: err.required,
            available: err.available,
            shortfall: (err.required || 0) - (err.available || 0),
          },
          { status: 402 },
        );
      }
      if (err?.message === 'Wallet is frozen') {
        return NextResponse.json(
          { error: 'Your wallet is frozen. Please contact support.' },
          { status: 403 },
        );
      }
      if (
        typeof err?.message === 'string' &&
        err.message.startsWith('Billable item')
      ) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  } catch (error) {
    console.error('[Charge] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/wallet/charge - Service pricing snapshot.
 * Returns the active billable items as `{ type, amount, description }`
 * so that older clients keep working.
 */
export async function GET() {
  const items = await getBillableItems();
  const pricing = items
    .filter((i) => i.is_active !== false)
    .map((i) => ({
      type: i.id,
      amount: i.price,
      description: i.name,
      category: i.category || null,
      currency: 'KES',
    }));
  return NextResponse.json({ success: true, pricing });
}
