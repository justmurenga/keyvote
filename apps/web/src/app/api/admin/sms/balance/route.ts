import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { getAirtouchBalance } from '@/lib/sms/airtouch';

// GET /api/admin/sms/balance — Admin-only: fetch remaining SMS balance from Airtouch
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'system_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await getAirtouchBalance();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch balance',
          balance: null,
          currency: result.currency || 'KES',
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      balance: result.balance ?? 0,
      currency: result.currency || 'KES',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Airtouch balance error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', balance: null },
      { status: 500 },
    );
  }
}
