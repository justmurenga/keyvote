import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveUserId } from '@/lib/auth';
import { getOrCreateWallet, syncWalletBalance, calculateWalletBalance } from '@/lib/wallet';

/**
 * GET /api/wallet/balance - Get wallet balance with verification
 * 
 * Returns the wallet balance, and optionally verifies it against transactions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    const { searchParams } = new URL(request.url);
    const verify = searchParams.get('verify') === 'true';

    if (verify) {
      // Calculate balance from transactions
      const calculated = await calculateWalletBalance(wallet.id);
      
      return NextResponse.json({
        success: true,
        balance: wallet.balance,
        calculatedBalance: calculated.balance,
        match: wallet.balance === calculated.balance,
        details: {
          totalCredited: calculated.totalCredited,
          totalDebited: calculated.totalDebited,
          pendingCredits: calculated.pendingCredits,
          pendingDebits: calculated.pendingDebits,
          availableBalance: calculated.availableBalance,
        },
        currency: wallet.currency || 'KES',
        isActive: wallet.is_active,
        isFrozen: wallet.is_frozen,
        frozenReason: wallet.frozen_reason,
      });
    }

    return NextResponse.json({
      success: true,
      balance: wallet.balance || 0,
      totalCredited: wallet.total_credited || 0,
      totalDebited: wallet.total_debited || 0,
      availableBalance: wallet.balance || 0,
      currency: wallet.currency || 'KES',
      isActive: wallet.is_active,
      isFrozen: wallet.is_frozen,
      frozenReason: wallet.frozen_reason,
      lastUpdated: wallet.updated_at,
    });

  } catch (error) {
    console.error('[Balance] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wallet/balance - Sync wallet balance with transactions
 * 
 * Recalculates the balance from all transactions and updates the wallet
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const wallet = await getOrCreateWallet(userId) as { id: string; balance: number };

    // Get balance before sync
    const balanceBefore = wallet.balance;

    // Sync balance
    await syncWalletBalance(wallet.id);

    // Get updated balance
    const calculated = await calculateWalletBalance(wallet.id);

    return NextResponse.json({
      success: true,
      message: 'Balance synchronized successfully',
      balanceBefore,
      balanceAfter: calculated.balance,
      adjusted: balanceBefore !== calculated.balance,
      adjustment: calculated.balance - (balanceBefore || 0),
    });

  } catch (error) {
    console.error('[Balance Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
