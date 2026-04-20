import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Representative',
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly (MCA)',
};

/**
 * GET /api/admin/candidate-fees - Get candidate vying fees and party nomination fees
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: user } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || !['admin', 'system_admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [{ data: vyingFees, error: vErr }, { data: nominationFees, error: nErr }] = await Promise.all([
      adminClient.from('candidate_vying_fees').select('*').order('fee_amount', { ascending: false }),
      adminClient.from('party_nomination_fees').select('*').order('fee_amount', { ascending: false }),
    ]);

    if (vErr || nErr) {
      console.error('[CandidateFees GET] Error:', vErr || nErr);
      return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 });
    }

    // Get recent payments summary
    const { data: recentPayments } = await adminClient
      .from('candidate_fee_payments')
      .select('id, fee_type, position, amount, status, paid_at')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      vyingFees: vyingFees || [],
      nominationFees: nominationFees || [],
      recentPayments: recentPayments || [],
      positionLabels: POSITION_LABELS,
    });
  } catch (error) {
    console.error('[CandidateFees GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/candidate-fees - Update vying or nomination fees
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: user } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || !['admin', 'system_admin'].includes(user.role as string)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { feeType, fees } = body;

    if (!feeType || !['vying', 'nomination'].includes(feeType)) {
      return NextResponse.json({ error: 'feeType must be "vying" or "nomination"' }, { status: 400 });
    }

    if (!Array.isArray(fees)) {
      return NextResponse.json({ error: 'fees must be an array' }, { status: 400 });
    }

    const table = feeType === 'vying' ? 'candidate_vying_fees' : 'party_nomination_fees';

    for (const fee of fees) {
      if (!fee.position || typeof fee.fee_amount !== 'number' || fee.fee_amount < 0) {
        return NextResponse.json({ error: `Invalid fee entry for position: ${fee.position}` }, { status: 400 });
      }

      const { error } = await adminClient
        .from(table)
        .update({
          fee_amount: fee.fee_amount,
          description: fee.description || null,
          is_active: fee.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('position', fee.position);

      if (error) {
        console.error(`[CandidateFees PUT] Error updating ${fee.position}:`, error);
        return NextResponse.json({ error: `Failed to update fee for ${fee.position}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CandidateFees PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
