import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

/**
 * POST /api/agents/[id]/revoke - Revoke an agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || null;

    const adminClient = createAdminClient();

    // Get agent and verify ownership
    const { data: agent } = await adminClient
      .from('agents')
      .select('id, candidate_id, status, user_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify caller is the candidate owner or system admin
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id')
      .eq('id', agent.candidate_id)
      .eq('user_id', userId)
      .single();

    if (!candidate) {
      const { data: user } = await adminClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (user?.role !== 'system_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    if (agent.status === 'revoked') {
      return NextResponse.json({ error: 'Agent is already revoked' }, { status: 400 });
    }

    // Revoke the agent
    const { data: updated, error: updateError } = await adminClient
      .from('agents')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
        invitation_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error revoking agent:', updateError);
      return NextResponse.json({ error: 'Failed to revoke agent' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agent: updated,
      message: 'Agent revoked successfully',
    });
  } catch (error) {
    console.error('Agent revoke error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
