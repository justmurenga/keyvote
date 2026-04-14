import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { getOrCreateWallet } from '@/lib/wallet';

/**
 * POST /api/wallet/pay-agent - Pay an agent from candidate's wallet
 * 
 * This endpoint is specifically for candidates to pay their agents.
 * 
 * Request body:
 * - agentId: The agent's ID
 * - amount: Amount to pay
 * - description: Optional reason/description for payment
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
    const { agentId, amount, description } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum payment is KES 1' },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify the user is a candidate
    const { data: candidate, error: candidateError } = await adminClient
      .from('candidates')
      .select('id, user_id')
      .eq('user_id', userId)
      .single() as { data: { id: string; user_id: string } | null; error: any };

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Only candidates can pay agents' },
        { status: 403 }
      );
    }

    // Verify the agent belongs to this candidate
    const { data: agent, error: agentError } = await adminClient
      .from('agents')
      .select(`
        id,
        user_id,
        candidate_id,
        status,
        users:user_id (
          id,
          full_name,
          phone_number
        )
      `)
      .eq('id', agentId)
      .single() as { data: { id: string; user_id: string; candidate_id: string; status: string; users: any } | null; error: any };

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.candidate_id !== candidate.id) {
      return NextResponse.json(
        { error: 'This agent is not assigned to you' },
        { status: 403 }
      );
    }

    if (agent.status !== 'active') {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 400 }
      );
    }

    // Get candidate's wallet
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

    // Get agent's wallet
    const recipientWallet = await getOrCreateWallet(agent.user_id) as { id: string; balance: number; is_frozen: boolean };

    if (recipientWallet.is_frozen) {
      return NextResponse.json(
        { error: 'Agent wallet is frozen' },
        { status: 400 }
      );
    }

    const agentName = (agent.users as { full_name: string })?.full_name || 'Agent';
    const paymentDescription = description || `Agent payment to ${agentName}`;

    // Perform the transfer
    const { data: transferId, error: transferError } = await (adminClient as any)
      .rpc('transfer_between_wallets', {
        p_sender_wallet_id: senderWallet.id,
        p_recipient_wallet_id: recipientWallet.id,
        p_amount: amount,
        p_description: paymentDescription,
        p_transfer_type: 'agent_payment',
        p_agent_id: agentId,
      });

    if (transferError) {
      console.error('[PayAgent] Transfer error:', transferError);
      return NextResponse.json(
        { error: 'Payment failed. Please try again.' },
        { status: 500 }
      );
    }

    // Update agent's total payments received
    await (adminClient as any)
      .from('agents')
      .update({
        total_payments_received: ((agent as any).total_payments_received || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    return NextResponse.json({
      success: true,
      transferId,
      message: `Successfully paid KES ${amount.toLocaleString()} to ${agentName}`,
      agent: {
        id: agentId,
        userId: agent.user_id,
        name: agentName,
      },
      amount,
    });

  } catch (error) {
    console.error('[PayAgent] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/pay-agent - Get list of agents that can be paid
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

    const adminClient = createAdminClient();

    // Verify the user is a candidate
    const { data: candidate, error: candidateError } = await adminClient
      .from('candidates')
      .select('id')
      .eq('user_id', userId)
      .single() as { data: { id: string } | null; error: any };

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Only candidates can access this endpoint' },
        { status: 403 }
      );
    }

    // Get all active agents for this candidate
    const { data: agents, error: agentsError } = await adminClient
      .from('agents')
      .select(`
        id,
        user_id,
        status,
        total_payments_received,
        assigned_region_type,
        users:user_id (
          id,
          full_name,
          phone_number
        ),
        wallets:user_id (
          id,
          balance
        )
      `)
      .eq('candidate_id', candidate.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

    if (agentsError) {
      console.error('[PayAgent] Failed to fetch agents:', agentsError);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    // Format agents for response
    const formattedAgents = (agents || []).map(agent => ({
      id: agent.id,
      userId: agent.user_id,
      name: (agent.users as { full_name: string })?.full_name || 'Unknown',
      phone: (agent.users as { phone_number: string })?.phone_number || '',
      region: agent.assigned_region_type,
      totalPaid: agent.total_payments_received || 0,
      walletBalance: (agent.wallets as { balance: number })?.balance || 0,
    }));

    return NextResponse.json({
      success: true,
      agents: formattedAgents,
    });

  } catch (error) {
    console.error('[PayAgent] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
