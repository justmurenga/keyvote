import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { 
  getOrCreateWallet, 
  getWalletTransactions, 
  calculateWalletBalance 
} from '@/lib/wallet';

/**
 * GET /api/wallet - Get current user's wallet and recent transactions
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create wallet using wallet service
    const wallet = await getOrCreateWallet(userId) as { 
      id: string; 
      balance: number; 
      currency: string; 
      is_active: boolean; 
      is_frozen: boolean;
      frozen_reason: string | null;
      total_credited: number;
      total_debited: number;
      updated_at: string;
    };
    const adminClient = createAdminClient();

    // Get recent transactions using wallet service
    const transactionResult = await getWalletTransactions({
      walletId: wallet.id,
      page: 1,
      pageSize: 20,
    });

    // Get pending STK requests
    const { data: pendingStk, error: stkError } = await adminClient
      .from('mpesa_stk_requests')
      .select('id, amount, phone_number, checkout_request_id, status, created_at')
      .eq('wallet_id', wallet.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5) as { data: any[] | null; error: any };

    if (stkError) {
      console.error('[Wallet] Failed to fetch pending STK requests:', stkError);
    }

    // Get pending withdrawals
    const { data: pendingWithdrawals, error: withdrawError } = await adminClient
      .from('mpesa_disbursements')
      .select('id, amount, recipient_phone, status, created_at')
      .eq('sender_wallet_id', wallet.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5) as { data: any[] | null; error: any };

    if (withdrawError) {
      console.error('[Wallet] Failed to fetch pending withdrawals:', withdrawError);
    }

    // Calculate real balance for verification (optional)
    let balanceVerified = true;
    try {
      const calculated = await calculateWalletBalance(wallet.id);
      balanceVerified = (wallet.balance || 0) === calculated.balance;
    } catch {
      // Non-critical, just for monitoring
    }

    return NextResponse.json({
      wallet: {
        ...wallet,
        balanceVerified,
      },
      transactions: transactionResult.transactions,
      transactionCount: transactionResult.total,
      pendingTopups: pendingStk || [],
      pendingWithdrawals: pendingWithdrawals || [],
    });

  } catch (error) {
    console.error('[Wallet] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
