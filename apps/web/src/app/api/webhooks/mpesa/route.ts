import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  parseCallback, 
  isTransactionSuccessful, 
  getResultCodeMessage,
  type MpesaCallbackBody 
} from '@/lib/mpesa';
import { v4 as uuidv4 } from 'uuid';

/**
 * M-Pesa Callback Webhook Handler
 * 
 * This endpoint receives callbacks from M-Pesa when an STK Push payment
 * is completed, cancelled, or times out.
 * 
 * NOTE: This endpoint must be publicly accessible and whitelisted by Safaricom
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MpesaCallbackBody;
    
    console.log('[M-Pesa Callback] Received:', JSON.stringify(body, null, 2));

    // Parse the callback data
    const callbackData = parseCallback(body);
    
    console.log('[M-Pesa Callback] Parsed:', callbackData);

    const adminClient = createAdminClient();

    // Find the STK request by checkout request ID
    const { data: stkRequest, error: findError } = await adminClient
      .from('mpesa_stk_requests')
      .select('id, wallet_id, amount, status')
      .eq('checkout_request_id', callbackData.checkoutRequestId)
      .single();

    if (findError || !stkRequest) {
      console.error('[M-Pesa Callback] STK request not found:', callbackData.checkoutRequestId);
      // Return 200 to M-Pesa so they don't retry
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Check if already processed
    if (stkRequest.status !== 'pending') {
      console.log('[M-Pesa Callback] Already processed:', stkRequest.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    // Determine status from result code
    let status: 'success' | 'failed' | 'cancelled';
    if (isTransactionSuccessful(callbackData)) {
      status = 'success';
    } else if (callbackData.resultCode === 1032) {
      status = 'cancelled';
    } else {
      status = 'failed';
    }

    // Update STK request status
    const updateData: Record<string, unknown> = {
      status: status,
      result_code: String(callbackData.resultCode),
      result_description: getResultCodeMessage(callbackData.resultCode),
      completed_at: new Date().toISOString(),
    };

    // If successful, create wallet transaction and credit wallet
    if (status === 'success' && callbackData.amount) {
      const amount = callbackData.amount;
      const mpesaReceiptNumber = callbackData.mpesaReceiptNumber || '';

      // Get current wallet balance
      const { data: wallet, error: walletError } = await adminClient
        .from('wallets')
        .select('id, balance, total_credited')
        .eq('id', stkRequest.wallet_id)
        .single();

      if (walletError || !wallet) {
        console.error('[M-Pesa Callback] Wallet not found:', stkRequest.wallet_id);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Wallet not found' });
      }

      const balanceBefore = wallet.balance || 0;
      const balanceAfter = balanceBefore + amount;
      const transactionId = uuidv4();

      // Create wallet transaction
      const { error: txError } = await adminClient
        .from('wallet_transactions')
        .insert({
          id: transactionId,
          wallet_id: stkRequest.wallet_id,
          type: 'topup',
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: 'M-Pesa Top Up',
          reference: `STK-${callbackData.checkoutRequestId}`,
          external_reference: mpesaReceiptNumber,
          mpesa_receipt_number: mpesaReceiptNumber,
          mpesa_transaction_date: callbackData.transactionDate 
            ? new Date(
                callbackData.transactionDate.replace(
                  /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
                  '$1-$2-$3T$4:$5:$6'
                )
              ).toISOString()
            : new Date().toISOString(),
          mpesa_phone_number: callbackData.phoneNumber,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

      if (txError) {
        console.error('[M-Pesa Callback] Failed to create transaction:', txError);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Transaction creation failed' });
      }

      // Update wallet balance
      const { error: updateWalletError } = await adminClient
        .from('wallets')
        .update({
          balance: balanceAfter,
          total_credited: (wallet.total_credited || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stkRequest.wallet_id);

      if (updateWalletError) {
        console.error('[M-Pesa Callback] Failed to update wallet:', updateWalletError);
      }

      // Link transaction to STK request
      updateData.transaction_id = transactionId;

      console.log('[M-Pesa Callback] Wallet credited successfully:', {
        walletId: stkRequest.wallet_id,
        amount: amount,
        newBalance: balanceAfter,
        mpesaReceipt: mpesaReceiptNumber,
      });
    }

    // Update STK request
    const { error: updateError } = await adminClient
      .from('mpesa_stk_requests')
      .update(updateData)
      .eq('id', stkRequest.id);

    if (updateError) {
      console.error('[M-Pesa Callback] Failed to update STK request:', updateError);
    }

    console.log('[M-Pesa Callback] Processed successfully:', {
      checkoutRequestId: callbackData.checkoutRequestId,
      status: status,
      resultCode: callbackData.resultCode,
    });

    // Respond to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('[M-Pesa Callback] Error processing callback:', error);
    // Always return 200 to M-Pesa to prevent retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Error processing callback' });
  }
}

// M-Pesa only sends POST requests
export async function GET() {
  return NextResponse.json({ message: 'M-Pesa webhook endpoint is active' });
}
