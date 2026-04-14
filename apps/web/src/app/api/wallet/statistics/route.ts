import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveUserId } from '@/lib/auth';
import { 
  getOrCreateWallet, 
  getWalletStatistics,
  calculateWalletBalance,
} from '@/lib/wallet';

/**
 * GET /api/wallet/statistics - Get wallet statistics
 * 
 * Query parameters:
 * - period: 'week' | 'month' | 'year' | 'all' (default: 'month')
 * - startDate: Custom start date (ISO string)
 * - endDate: Custom end date (ISO string)
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

    const wallet = await getOrCreateWallet(userId) as { id: string; balance: number };
    const { searchParams } = new URL(request.url);

    // Calculate date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const period = searchParams.get('period') || 'month';
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');

    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      const now = new Date();
      endDate = now;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
          startDate = undefined;
          endDate = undefined;
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    // Get statistics
    const statistics = await getWalletStatistics(wallet.id, startDate, endDate);

    // Get real-time balance calculation
    const balanceInfo = await calculateWalletBalance(wallet.id);

    // Calculate spending by category for chart
    const spendingByCategory = Object.entries(statistics.transactionsByType)
      .filter(([type]) => !['topup', 'refund'].includes(type))
      .map(([type, data]) => ({
        type: formatTransactionType(type),
        amount: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      period,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        calculatedBalance: balanceInfo.balance,
        balanceMatch: wallet.balance === balanceInfo.balance,
        pendingCredits: balanceInfo.pendingCredits,
        pendingDebits: balanceInfo.pendingDebits,
        availableBalance: balanceInfo.availableBalance,
      },
      statistics: {
        ...statistics,
        spendingByCategory,
        netChange: statistics.totalCredits - statistics.totalDebits,
      },
    });

  } catch (error) {
    console.error('[Statistics] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Format transaction type for display
 */
function formatTransactionType(type: string): string {
  const typeMap: Record<string, string> = {
    topup: 'M-Pesa Top Up',
    sms_charge: 'SMS Alerts',
    whatsapp_charge: 'WhatsApp Alerts',
    poll_view_charge: 'Poll Views',
    result_view_charge: 'Results Views',
    mpesa_disbursement: 'M-Pesa Withdrawals',
    subscription_charge: 'Subscriptions',
    refund: 'Refunds',
    credit_purchase: 'Credit Purchases',
  };
  return typeMap[type] || type;
}
