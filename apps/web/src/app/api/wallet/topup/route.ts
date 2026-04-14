import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { getMpesaConfig, initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa';
import { v4 as uuidv4 } from 'uuid';

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

    // Parse request body
    const body = await request.json();
    const { amount, phoneNumber } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 10 || amount > 150000) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum is KES 10, maximum is KES 150,000' },
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

    const adminClient = createAdminClient();

    // Get user's wallet
    let { data: wallet, error: walletError } = await adminClient
      .from('wallets')
      .select('id, is_active, is_frozen')
      .eq('user_id', userId)
      .single() as { data: { id: string; is_active: boolean; is_frozen: boolean } | null; error: any };

    if (walletError || !wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await (adminClient as any)
        .from('wallets')
        .insert({ user_id: userId })
        .select('id, is_active, is_frozen')
        .single() as { data: { id: string; is_active: boolean; is_frozen: boolean } | null; error: any };

      if (createError || !newWallet) {
        console.error('[Wallet TopUp] Failed to create wallet:', createError);
        return NextResponse.json(
          { error: 'Failed to create wallet' },
          { status: 500 }
        );
      }

      wallet = newWallet;
    }

    // Check if wallet is frozen
    if (wallet?.is_frozen) {
      return NextResponse.json(
        { error: 'Your wallet is frozen. Please contact support.' },
        { status: 403 }
      );
    }

    // Generate a unique reference for this transaction
    const transactionReference = `MYV${Date.now().toString(36).toUpperCase()}`;

    // Get M-Pesa config and initiate STK Push
    let stkResponse;
    try {
      const mpesaConfig = getMpesaConfig();
      stkResponse = await initiateSTKPush(mpesaConfig, {
        phoneNumber: formattedPhone,
        amount: Math.round(amount),
        accountReference: transactionReference,
        transactionDesc: 'Wallet TopUp',
      });
    } catch (err) {
      console.error('[Wallet TopUp] M-Pesa STK Push failed:', err);
      return NextResponse.json(
        { error: 'Failed to initiate M-Pesa payment. Please try again.' },
        { status: 500 }
      );
    }

    // Store the STK request in database for callback tracking
    const { error: stkError } = await (adminClient as any)
      .from('mpesa_stk_requests')
      .insert({
        id: uuidv4(),
        wallet_id: wallet!.id,
        phone_number: formattedPhone,
        amount: amount,
        merchant_request_id: stkResponse.MerchantRequestID,
        checkout_request_id: stkResponse.CheckoutRequestID,
        status: 'pending',
      });

    if (stkError) {
      console.error('[Wallet TopUp] Failed to store STK request:', stkError);
      // Don't fail the request, the payment might still succeed
    }

    return NextResponse.json({
      success: true,
      message: stkResponse.CustomerMessage,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
    });

  } catch (error) {
    console.error('[Wallet TopUp] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
