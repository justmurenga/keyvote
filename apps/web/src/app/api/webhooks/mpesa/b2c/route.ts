import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * M-Pesa B2C Result Callback
 * 
 * This endpoint receives callbacks from M-Pesa when a B2C disbursement
 * is completed or fails.
 */

interface B2CCallbackBody {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
  };
}

interface ParsedB2CResult {
  resultCode: number;
  resultDesc: string;
  conversationId: string;
  originatorConversationId: string;
  transactionId: string;
  amount?: number;
  recipientPhone?: string;
  recipientName?: string;
  completedTime?: string;
}

/**
 * Parse B2C callback result
 */
function parseB2CCallback(body: B2CCallbackBody): ParsedB2CResult {
  const result = body.Result;
  
  const parsed: ParsedB2CResult = {
    resultCode: result.ResultCode,
    resultDesc: result.ResultDesc,
    conversationId: result.ConversationID,
    originatorConversationId: result.OriginatorConversationID,
    transactionId: result.TransactionID,
  };

  // Extract result parameters if present
  if (result.ResultParameters?.ResultParameter) {
    for (const param of result.ResultParameters.ResultParameter) {
      switch (param.Key) {
        case 'TransactionAmount':
          parsed.amount = param.Value as number;
          break;
        case 'ReceiverPartyPublicName':
          parsed.recipientName = param.Value as string;
          break;
        case 'B2CRecipientIsRegisteredCustomer':
          // We can log this for reference
          break;
        case 'TransactionCompletedDateTime':
          parsed.completedTime = param.Value as string;
          break;
      }
    }
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as B2CCallbackBody;
    
    console.log('[B2C Callback] Received:', JSON.stringify(body, null, 2));

    const parsed = parseB2CCallback(body);
    
    console.log('[B2C Callback] Parsed:', parsed);

    const adminClient = createAdminClient();

    // Find the disbursement by conversation ID
    const { data: disbursement, error: findError } = await adminClient
      .from('mpesa_disbursements')
      .select('id, sender_wallet_id, amount, status, transaction_id')
      .eq('conversation_id', parsed.conversationId)
      .single();

    if (findError || !disbursement) {
      // Try by originator conversation ID
      const { data: disbByOrig, error: origError } = await adminClient
        .from('mpesa_disbursements')
        .select('id, sender_wallet_id, amount, status, transaction_id')
        .eq('originator_conversation_id', parsed.originatorConversationId)
        .single();

      if (origError || !disbByOrig) {
        console.error('[B2C Callback] Disbursement not found:', parsed.conversationId);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }
      
      // Use the one found by originator conversation ID
      Object.assign(disbursement, disbByOrig);
    }

    // Check if already processed
    if (disbursement.status !== 'pending') {
      console.log('[B2C Callback] Already processed:', disbursement.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    // Determine status from result code
    const isSuccess = parsed.resultCode === 0;
    const status = isSuccess ? 'completed' : 'failed';

    // Update disbursement
    const { error: updateError } = await adminClient
      .from('mpesa_disbursements')
      .update({
        status: status,
        mpesa_receipt_number: parsed.transactionId,
        result_code: String(parsed.resultCode),
        result_description: parsed.resultDesc,
        recipient_name: parsed.recipientName || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', disbursement.id);

    if (updateError) {
      console.error('[B2C Callback] Failed to update disbursement:', updateError);
    }

    // If failed, we might need to refund the wallet
    if (!isSuccess && disbursement.transaction_id) {
      // The wallet was already debited, need to create a refund
      const { data: wallet } = await adminClient
        .from('wallets')
        .select('balance, total_credited')
        .eq('id', disbursement.sender_wallet_id)
        .single();

      if (wallet) {
        const refundAmount = disbursement.amount;
        const balanceBefore = wallet.balance || 0;
        const balanceAfter = balanceBefore + refundAmount;

        // Create refund transaction
        const { error: txError } = await adminClient
          .from('wallet_transactions')
          .insert({
            wallet_id: disbursement.sender_wallet_id,
            type: 'refund',
            amount: refundAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `Refund for failed withdrawal: ${parsed.resultDesc}`,
            reference: `REFUND-${disbursement.id.substring(0, 8)}`,
            external_reference: parsed.conversationId,
            status: 'completed',
            completed_at: new Date().toISOString(),
          });

        if (txError) {
          console.error('[B2C Callback] Failed to create refund transaction:', txError);
        } else {
          // Update wallet balance
          await adminClient
            .from('wallets')
            .update({
              balance: balanceAfter,
              total_credited: (wallet.total_credited || 0) + refundAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', disbursement.sender_wallet_id);

          console.log('[B2C Callback] Refund processed:', {
            walletId: disbursement.sender_wallet_id,
            amount: refundAmount,
            newBalance: balanceAfter,
          });
        }
      }
    }

    console.log('[B2C Callback] Processed successfully:', {
      conversationId: parsed.conversationId,
      status,
      transactionId: parsed.transactionId,
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('[B2C Callback] Error:', error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Error' });
  }
}

/**
 * B2C Queue Timeout Handler
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[B2C Timeout] Received:', JSON.stringify(body, null, 2));

    // Timeouts typically don't need much processing
    // The transaction will either complete later or stay pending
    // We can set up a job to check for stale pending transactions

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  } catch (error) {
    console.error('[B2C Timeout] Error:', error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Error' });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'B2C webhook endpoint is active' });
}
