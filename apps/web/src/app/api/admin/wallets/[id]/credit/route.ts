import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';
import { creditWallet } from '@/lib/wallet';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/wallets/:id/credit
 * Admin manually credits a user wallet. Creates an audited wallet_transaction
 * with type "topup" and metadata identifying the admin and the reason.
 *
 * Body:
 *  - amount: number (KES, > 0)
 *  - description?: string
 *  - reference?: string  (e.g. internal voucher / receipt)
 */
export async function POST(request: NextRequest, ctx: RouteContext) {
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
    const body = await request.json();
    const amount = Number(body?.amount);
    const description: string =
      (body?.description && String(body.description).trim()) ||
      'Manual top-up by administrator';
    const reference: string | undefined = body?.reference
      ? String(body.reference).trim()
      : undefined;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 },
      );
    }
    if (amount > 1_000_000) {
      return NextResponse.json(
        { error: 'Amount exceeds the maximum allowed (1,000,000 KES)' },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    // Ensure wallet exists & is not frozen
    const { data: wallet, error: wErr } = await adminClient
      .from('wallets')
      .select('id, is_frozen, is_active, user_id')
      .eq('id', walletId)
      .single();

    if (wErr || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }
    if ((wallet as any).is_frozen) {
      return NextResponse.json(
        { error: 'Cannot credit a frozen wallet. Unfreeze it first.' },
        { status: 400 },
      );
    }

    const transactionId = await creditWallet({
      walletId: (wallet as any).id,
      type: 'topup',
      amount,
      description,
      reference: reference || `admin-credit-${Date.now()}`,
      metadata: {
        source: 'admin_manual_credit',
        admin_id: currentUser.id,
        admin_name: (currentUser as any).full_name || null,
        target_user_id: (wallet as any).user_id,
        granted_at: new Date().toISOString(),
      },
    });

    // Best-effort audit log entry (don't fail the request if it errors)
    try {
      await adminClient.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'wallet.credit',
        target_type: 'wallet',
        target_id: walletId,
        metadata: {
          amount,
          description,
          reference,
          transaction_id: transactionId,
        },
      } as any);
    } catch {
      // audit_logs table may not exist in this schema — ignore
    }

    return NextResponse.json({
      success: true,
      transactionId,
      amount,
      description,
    });
  } catch (error) {
    console.error('[Admin Wallet CREDIT] error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
