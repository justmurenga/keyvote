import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveUserId } from '@/lib/auth';
import { getWalletTransactions, getOrCreateWallet } from '@/lib/wallet';
import type { TransactionType, TransactionStatus } from '@myvote/database';

/**
 * GET /api/wallet/transactions - Get paginated transaction history
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - type: Transaction type filter (comma-separated for multiple)
 * - status: Transaction status filter (comma-separated for multiple)
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - minAmount: Minimum amount filter
 * - maxAmount: Maximum amount filter
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

    // Get user's wallet
    const wallet = await getOrCreateWallet(userId) as { id: string };

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    
    // Parse type filter
    const typeParam = searchParams.get('type');
    const type = typeParam 
      ? typeParam.split(',').map(t => t.trim()) as TransactionType[]
      : undefined;

    // Parse status filter
    const statusParam = searchParams.get('status');
    const status = statusParam
      ? statusParam.split(',').map(s => s.trim()) as TransactionStatus[]
      : undefined;

    // Parse date filters
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Parse amount filters
    const minAmountParam = searchParams.get('minAmount');
    const maxAmountParam = searchParams.get('maxAmount');
    const minAmount = minAmountParam ? parseFloat(minAmountParam) : undefined;
    const maxAmount = maxAmountParam ? parseFloat(maxAmountParam) : undefined;

    // Fetch transactions with filters
    const result = await getWalletTransactions({
      walletId: wallet.id,
      type,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[Transactions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
