import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

/**
 * POST /api/agents/[id]/accept - Accept an agent invitation
 * Can be called with agent ID or invitation token
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
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Try to find agent by invitation token first, then by ID
    let agent;
    const { data: byToken } = await adminClient
      .from('agents')
      .select('*')
      .eq('invitation_token', id)
      .single();

    if (byToken) {
      agent = byToken;
    } else {
      const { data: byId } = await adminClient
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      agent = byId;
    }

    if (!agent) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
    }

    if (agent.status !== 'pending') {
      return NextResponse.json({
        error: `This invitation has already been ${agent.status}`,
      }, { status: 400 });
    }

    // Check if user already is an active agent for this candidate
    const { data: existing } = await adminClient
      .from('agents')
      .select('id')
      .eq('user_id', userId)
      .eq('candidate_id', agent.candidate_id)
      .eq('status', 'active')
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'You are already an active agent for this candidate',
      }, { status: 409 });
    }

    // Accept the invitation
    const { data: updated, error: updateError } = await adminClient
      .from('agents')
      .update({
        user_id: userId,
        status: 'active',
        accepted_at: new Date().toISOString(),
        invitation_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent.id)
      .select(`
        *,
        candidates:candidate_id (id, position, users:user_id (full_name))
      `)
      .single();

    if (updateError) {
      console.error('Error accepting invitation:', updateError);
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

    // Promote user role to agent if currently a voter
    await adminClient
      .from('users')
      .update({ role: 'agent', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('role', 'voter');

    return NextResponse.json({
      success: true,
      agent: updated,
      message: 'Invitation accepted successfully! You are now an agent.',
    });
  } catch (error) {
    console.error('Agent accept error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
