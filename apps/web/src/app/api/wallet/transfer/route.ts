import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { getOrCreateWallet, getWalletByUserId } from '@/lib/wallet';

/**
 * POST /api/wallet/transfer - Transfer funds to another user's wallet
 * 
 * Request body:
 * - amount: Amount to transfer (min 1)
 * - recipientId: User ID or phone number of recipient
 * - recipientType: 'user_id' | 'phone' | 'agent_id'
 * - description: Optional description
 * - transferType: 'general' | 'agent_payment' (default: 'general')
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
    const { 
      amount, 
      recipientId, 
      recipientType = 'user_id',
      description,
      transferType = 'general',
    } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum transfer is KES 1' },
        { status: 400 }
      );
    }

    if (amount > 1000000) {
      return NextResponse.json(
        { error: 'Maximum transfer amount is KES 1,000,000' },
        { status: 400 }
      );
    }

    // Validate recipient
    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get sender's wallet
    const senderWallet = await getOrCreateWallet(userId) as { id: string; balance: number; is_frozen: boolean };

    if (senderWallet.is_frozen) {
      return NextResponse.json(
        { error: 'Your wallet is frozen. Please contact support.' },
        { status: 403 }
      );
    }

    if ((senderWallet.balance || 0) < amount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    // Find recipient based on type
    let recipientUserId: string | null = null;
    let agentId: string | null = null;
    let recipientName: string | null = null;

    if (recipientType === 'user_id') {
      // Direct user ID lookup
      const { data: user, error } = await adminClient
        .from('users')
        .select('id, full_name')
        .eq('id', recipientId)
        .single() as { data: { id: string; full_name: string } | null; error: any };

      if (error || !user) {
        return NextResponse.json(
          { error: 'Recipient not found' },
          { status: 404 }
        );
      }

      recipientUserId = user.id;
      recipientName = user.full_name;

    } else if (recipientType === 'phone') {
      // Phone number lookup
      const { data: user, error } = await adminClient
        .from('users')
        .select('id, full_name')
        .eq('phone_number', recipientId)
        .single() as { data: { id: string; full_name: string } | null; error: any };

      if (error || !user) {
        return NextResponse.json(
          { error: 'No user found with this phone number' },
          { status: 404 }
        );
      }

      recipientUserId = user.id;
      recipientName = user.full_name;

    } else if (recipientType === 'agent_id') {
      // Agent lookup - get the agent's user
      const { data: agent, error } = await adminClient
        .from('agents')
        .select(`
          id,
          user_id,
          users:user_id (
            id,
            full_name
          )
        `)
        .eq('id', recipientId)
        .single() as { data: { id: string; user_id: string; users: { full_name: string } } | null; error: any };

      if (error || !agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      recipientUserId = agent.user_id;
      agentId = agent.id;
      recipientName = (agent.users as { full_name: string })?.full_name || 'Agent';

    } else {
      return NextResponse.json(
        { error: 'Invalid recipient type' },
        { status: 400 }
      );
    }

    // Ensure we have a recipient
    if (!recipientUserId) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Prevent self-transfer
    if (recipientUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot transfer to yourself' },
        { status: 400 }
      );
    }

    // Get or create recipient's wallet
    const recipientWallet = await getOrCreateWallet(recipientUserId);

    if (recipientWallet.is_frozen) {
      return NextResponse.json(
        { error: 'Recipient wallet is frozen' },
        { status: 400 }
      );
    }

    // Perform the transfer using database function for atomicity
    const { data: transferResult, error: transferError } = await adminClient
      .rpc('transfer_between_wallets', {
        p_sender_wallet_id: senderWallet.id,
        p_recipient_wallet_id: recipientWallet.id,
        p_amount: amount,
        p_description: description || `Transfer to ${recipientName}`,
        p_transfer_type: transferType,
        p_agent_id: agentId,
      });

    if (transferError) {
      console.error('[Transfer] Database error:', transferError);
      
      // Handle specific errors
      if (transferError.message?.includes('Insufficient')) {
        return NextResponse.json(
          { error: 'Insufficient wallet balance' },
          { status: 400 }
        );
      }
      if (transferError.message?.includes('frozen')) {
        return NextResponse.json(
          { error: 'One of the wallets is frozen' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Transfer failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transferId: transferResult,
      message: `Successfully transferred KES ${amount.toLocaleString()} to ${recipientName}`,
      recipient: {
        id: recipientUserId,
        name: recipientName,
      },
      amount,
    });

  } catch (error) {
    console.error('[Transfer] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/transfer - Get transfer history
 * 
 * Query parameters:
 * - type: 'sent' | 'received' | 'all' (default: 'all')
 * - page: Page number
 * - pageSize: Items per page
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    const adminClient = createAdminClient();

    // Build query based on type
    let query = adminClient
      .from('wallet_transfers')
      .select(`
        *,
        sender:sender_user_id (id, full_name, phone_number),
        recipient:recipient_user_id (id, full_name, phone_number)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (type === 'sent') {
      query = query.eq('sender_user_id', userId);
    } else if (type === 'received') {
      query = query.eq('recipient_user_id', userId);
    } else {
      // All transfers involving this user
      query = query.or(`sender_user_id.eq.${userId},recipient_user_id.eq.${userId}`);
    }

    const { data: transfers, error, count } = await query;

    if (error) {
      console.error('[Transfer] Failed to fetch transfers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transfers' },
        { status: 500 }
      );
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Add direction indicator to each transfer
    const transfersWithDirection = (transfers || []).map(transfer => ({
      ...transfer,
      direction: transfer.sender_user_id === userId ? 'sent' : 'received',
      displayAmount: transfer.sender_user_id === userId ? -transfer.amount : transfer.amount,
    }));

    return NextResponse.json({
      success: true,
      transfers: transfersWithDirection,
      total,
      page,
      pageSize,
      totalPages,
    });

  } catch (error) {
    console.error('[Transfer] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
