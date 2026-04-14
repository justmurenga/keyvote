import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { getMpesaConfig, querySTKPushStatus } from '@/lib/mpesa';

/**
 * Query the status of an STK Push request
 * Used to check if user completed the payment
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { checkoutRequestId } = body;

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: 'Checkout request ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // First check our database for the status
    const { data: stkRequest, error: stkError } = await adminClient
      .from('mpesa_stk_requests')
      .select('status, result_code, result_description, amount, transaction_id')
      .eq('checkout_request_id', checkoutRequestId)
      .single() as { data: { status: string; result_code: string | null; result_description: string | null; amount: number; transaction_id: string | null } | null; error: any };

    if (stkError || !stkRequest) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // If already processed, return the status from database
    if (stkRequest.status !== 'pending') {
      return NextResponse.json({
        status: stkRequest.status,
        resultCode: stkRequest.result_code,
        resultDescription: stkRequest.result_description,
        amount: stkRequest.amount,
        transactionId: stkRequest.transaction_id,
      });
    }

    // Query M-Pesa for current status
    try {
      const mpesaConfig = getMpesaConfig();
      const queryResult = await querySTKPushStatus(mpesaConfig, checkoutRequestId);

      // Map M-Pesa result code to status
      let status: 'pending' | 'success' | 'failed' | 'cancelled' = 'pending';
      
      if (queryResult.ResultCode === '0') {
        status = 'success';
      } else if (queryResult.ResultCode === '1032') {
        status = 'cancelled';
      } else if (queryResult.ResultCode !== undefined && queryResult.ResultCode !== '') {
        status = 'failed';
      }

      // Update our database with the latest status if changed
      if (status !== 'pending') {
        await (adminClient as any)
          .from('mpesa_stk_requests')
          .update({
            status: status,
            result_code: queryResult.ResultCode,
            result_description: queryResult.ResultDesc,
            completed_at: new Date().toISOString(),
          })
          .eq('checkout_request_id', checkoutRequestId);
      }

      return NextResponse.json({
        status: status,
        resultCode: queryResult.ResultCode,
        resultDescription: queryResult.ResultDesc,
        amount: stkRequest.amount,
      });

    } catch (err) {
      console.error('[STK Status] Query failed:', err);
      // Return pending if we can't query M-Pesa
      return NextResponse.json({
        status: 'pending',
        message: 'Waiting for payment confirmation',
      });
    }

  } catch (error) {
    console.error('[STK Status] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
