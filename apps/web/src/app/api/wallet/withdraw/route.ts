import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { getOrCreateWallet, debitWallet } from '@/lib/wallet';
import { formatPhoneNumber } from '@/lib/mpesa';
import { v4 as uuidv4 } from 'uuid';

// M-Pesa B2C Configuration
interface B2CConfig {
  consumerKey: string;
  consumerSecret: string;
  initiatorName: string;
  initiatorPassword: string;
  shortcode: string;
  resultUrl: string;
  queueTimeoutUrl: string;
  environment: 'sandbox' | 'production';
}

/**
 * Get M-Pesa B2C configuration
 */
function getB2CConfig(): B2CConfig {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const initiatorName = process.env.MPESA_INITIATOR_NAME;
  const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD;
  const shortcode = process.env.MPESA_SHORTCODE;
  const resultUrl = process.env.MPESA_B2C_RESULT_URL;
  const queueTimeoutUrl = process.env.MPESA_B2C_TIMEOUT_URL;
  const environment = (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  if (!consumerKey || !consumerSecret || !initiatorName || !initiatorPassword || !shortcode || !resultUrl || !queueTimeoutUrl) {
    throw new Error('Missing required M-Pesa B2C environment variables');
  }

  return {
    consumerKey,
    consumerSecret,
    initiatorName,
    initiatorPassword,
    shortcode,
    resultUrl,
    queueTimeoutUrl,
    environment,
  };
}

/**
 * Get M-Pesa access token
 */
async function getAccessToken(config: B2CConfig): Promise<string> {
  const baseUrl = config.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get M-Pesa access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * POST /api/wallet/withdraw - Initiate M-Pesa B2C withdrawal
 * 
 * Request body:
 * - amount: Amount to withdraw (min 10, max 70000)
 * - phoneNumber: M-Pesa phone number to receive funds
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

    const body = await request.json();
    const { amount, phoneNumber } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 10 || amount > 70000) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum is KES 10, maximum is KES 70,000' },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    let formattedPhone: string;
    try {
      formattedPhone = formatPhoneNumber(phoneNumber);
    } catch {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Get wallet and check balance
    const wallet = await getOrCreateWallet(userId);

    if (wallet.is_frozen) {
      return NextResponse.json(
        { error: 'Your wallet is frozen. Please contact support.' },
        { status: 403 }
      );
    }

    if ((wallet.balance || 0) < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const transactionReference = `WD-${Date.now().toString(36).toUpperCase()}`;
    const disbursementId = uuidv4();

    // Check if B2C is configured
    let b2cEnabled = false;
    try {
      getB2CConfig();
      b2cEnabled = true;
    } catch {
      // B2C not configured, will process manually
    }

    if (b2cEnabled) {
      // Create pending disbursement record
      const { error: disbError } = await adminClient
        .from('mpesa_disbursements')
        .insert({
          id: disbursementId,
          sender_wallet_id: wallet.id,
          recipient_phone: formattedPhone,
          amount: amount,
          reason: 'Wallet withdrawal',
          status: 'pending',
        });

      if (disbError) {
        console.error('[Withdraw] Failed to create disbursement record:', disbError);
        return NextResponse.json(
          { error: 'Failed to initiate withdrawal' },
          { status: 500 }
        );
      }

      // Initiate B2C transfer
      try {
        const config = getB2CConfig();
        const accessToken = await getAccessToken(config);
        const baseUrl = config.environment === 'production'
          ? 'https://api.safaricom.co.ke'
          : 'https://sandbox.safaricom.co.ke';

        // Generate security credential (in production, this needs proper RSA encryption)
        const securityCredential = config.environment === 'sandbox'
          ? config.initiatorPassword // Sandbox uses plain password
          : config.initiatorPassword; // Production needs RSA encryption

        const b2cPayload = {
          InitiatorName: config.initiatorName,
          SecurityCredential: securityCredential,
          CommandID: 'BusinessPayment',
          Amount: Math.round(amount),
          PartyA: config.shortcode,
          PartyB: formattedPhone,
          Remarks: 'Wallet Withdrawal',
          QueueTimeOutURL: config.queueTimeoutUrl,
          ResultURL: config.resultUrl,
          Occasion: transactionReference,
        };

        const response = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(b2cPayload),
        });

        const result = await response.json();

        if (!response.ok || result.ResponseCode !== '0') {
          console.error('[Withdraw] B2C request failed:', result);
          
          // Update disbursement as failed
          await adminClient
            .from('mpesa_disbursements')
            .update({
              status: 'failed',
              result_code: result.ResponseCode || result.errorCode,
              result_description: result.ResponseDescription || result.errorMessage,
              completed_at: new Date().toISOString(),
            })
            .eq('id', disbursementId);

          return NextResponse.json(
            { error: result.ResponseDescription || 'Failed to initiate withdrawal' },
            { status: 500 }
          );
        }

        // Update disbursement with conversation ID
        await adminClient
          .from('mpesa_disbursements')
          .update({
            conversation_id: result.ConversationID,
            originator_conversation_id: result.OriginatorConversationID,
          })
          .eq('id', disbursementId);

        // Debit wallet (create pending transaction)
        try {
          await debitWallet({
            walletId: wallet.id,
            type: 'mpesa_disbursement',
            amount: amount,
            description: `Withdrawal to ${formattedPhone}`,
            reference: transactionReference,
            externalReference: result.ConversationID,
          });
        } catch (debitError) {
          console.error('[Withdraw] Failed to debit wallet:', debitError);
          // The B2C might still succeed, admin will need to reconcile
        }

        return NextResponse.json({
          success: true,
          message: 'Withdrawal initiated. You will receive the funds shortly.',
          disbursementId,
          conversationId: result.ConversationID,
          reference: transactionReference,
        });

      } catch (err) {
        console.error('[Withdraw] B2C error:', err);
        
        await adminClient
          .from('mpesa_disbursements')
          .update({
            status: 'failed',
            result_description: 'System error during B2C request',
            completed_at: new Date().toISOString(),
          })
          .eq('id', disbursementId);

        return NextResponse.json(
          { error: 'Failed to initiate M-Pesa withdrawal. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // Manual processing mode - create withdrawal request
      const { error: disbError } = await adminClient
        .from('mpesa_disbursements')
        .insert({
          id: disbursementId,
          sender_wallet_id: wallet.id,
          recipient_phone: formattedPhone,
          amount: amount,
          reason: 'Wallet withdrawal (manual processing)',
          status: 'pending',
        });

      if (disbError) {
        console.error('[Withdraw] Failed to create disbursement record:', disbError);
        return NextResponse.json(
          { error: 'Failed to create withdrawal request' },
          { status: 500 }
        );
      }

      // Debit wallet immediately for manual processing
      try {
        await debitWallet({
          walletId: wallet.id,
          type: 'mpesa_disbursement',
          amount: amount,
          description: `Withdrawal request to ${formattedPhone} (pending)`,
          reference: transactionReference,
        });
      } catch (debitError) {
        // Rollback disbursement record
        await adminClient
          .from('mpesa_disbursements')
          .delete()
          .eq('id', disbursementId);

        const message = debitError instanceof Error ? debitError.message : 'Failed to process withdrawal';
        return NextResponse.json(
          { error: message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Withdrawal request submitted. Our team will process it within 24 hours.',
        disbursementId,
        reference: transactionReference,
        manualProcessing: true,
      });
    }

  } catch (error) {
    console.error('[Withdraw] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/withdraw - Get pending withdrawals
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

    const wallet = await getOrCreateWallet(userId);
    const adminClient = createAdminClient();

    // Get pending and recent withdrawals
    const { data: disbursements, error } = await adminClient
      .from('mpesa_disbursements')
      .select('*')
      .eq('sender_wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[Withdraw] Failed to fetch disbursements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawals: disbursements || [],
    });

  } catch (error) {
    console.error('[Withdraw] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
