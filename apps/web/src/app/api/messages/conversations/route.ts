import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';
import { resolveRegionScope, agentRegionOrClause } from '@/lib/regions/scope';

const ADMIN_ROLES = ['admin', 'system_admin'];

// POST /api/messages/conversations
// Body:
//  - { type: 'candidate_agent', otherUserId }                            // 1:1 candidate <-> agent
//  - { type: 'admin_user', recipientUserId, subject?, initialMessage? }  // admin starts a thread
//  - { type: 'broadcast_to_agents', initialMessage }                     // candidate -> all active agents
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const type: string = body.type || 'candidate_agent';
    const subject: string | null = body.subject?.trim() || null;
    const initialMessage: string | null = body.initialMessage?.trim() || null;

    const supabase = createAdminClient();

    // ---------- Broadcast: candidate -> all of his/her active agents ----------
    if (type === 'broadcast_to_agents') {
      if (!initialMessage) {
        return NextResponse.json({ error: 'initialMessage is required' }, { status: 400 });
      }
      const { data: meCandidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!meCandidate?.id) {
        return NextResponse.json({ error: 'Only candidates can broadcast to their agents' }, { status: 403 });
      }

      // Optional region filter — narrow agents by their assignment region.
      const countyId: string | undefined = body.countyId;
      const constituencyId: string | undefined = body.constituencyId;
      const wardId: string | undefined = body.wardId;
      const pollingStationId: string | undefined = body.pollingStationId;

      const regionScope = await resolveRegionScope(supabase, {
        countyId, constituencyId, wardId, pollingStationId,
      });

      let agentsQuery = supabase
        .from('agents')
        .select('id')
        .eq('candidate_id', meCandidate.id)
        .eq('status', 'active');

      const agentOr = agentRegionOrClause(regionScope);
      if (agentOr) agentsQuery = agentsQuery.or(agentOr);

      const { data: agents } = await agentsQuery;

      if (!agents || agents.length === 0) {
        return NextResponse.json({ error: 'You have no active agents to broadcast to' }, { status: 400 });
      }

      let delivered = 0;
      for (const agent of agents) {
        // Re-use existing thread per agent or create one.
        let convId: string | null = null;
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('candidate_id', meCandidate.id)
          .eq('agent_id', agent.id)
          .maybeSingle();
        if (existing?.id) {
          convId = existing.id;
        } else {
          const { data: created } = await supabase
            .from('conversations')
            .insert({
              conversation_type: 'candidate_agent',
              candidate_id: meCandidate.id,
              agent_id: agent.id,
              is_active: true,
            } as any)
            .select('id')
            .single();
          convId = created?.id ?? null;
        }
        if (!convId) continue;
        const { error: msgErr } = await supabase.from('messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          content: initialMessage,
        } as any);
        if (!msgErr) delivered += 1;
      }

      return NextResponse.json({ broadcast: true, delivered, total: agents.length });
    }

    if (type === 'admin_user') {
      if (!ADMIN_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Only admins can start admin conversations' }, { status: 403 });
      }
      const recipientUserId: string | undefined = body.recipientUserId;
      if (!recipientUserId) {
        return NextResponse.json({ error: 'recipientUserId is required' }, { status: 400 });
      }
      if (recipientUserId === user.id) {
        return NextResponse.json({ error: 'Cannot start a conversation with yourself' }, { status: 400 });
      }

      // Reuse existing thread if any.
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('conversation_type', 'admin_user')
        .or(
          `and(initiator_user_id.eq.${user.id},recipient_user_id.eq.${recipientUserId}),` +
          `and(initiator_user_id.eq.${recipientUserId},recipient_user_id.eq.${user.id})`,
        )
        .maybeSingle();

      let conversationId: string;
      if (existing?.id) {
        conversationId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from('conversations')
          .insert({
            conversation_type: 'admin_user',
            initiator_user_id: user.id,
            recipient_user_id: recipientUserId,
            subject,
            is_active: true,
          } as any)
          .select('id')
          .single();
        if (error || !created) {
          return NextResponse.json({ error: error?.message || 'Failed to create conversation' }, { status: 500 });
        }
        conversationId = created.id;
      }

      if (initialMessage) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: initialMessage,
        } as any);
      }

      return NextResponse.json({ conversationId });
    }

    // ---- candidate_agent flow (callable by candidate or agent) ----
    const otherUserId: string | undefined = body.otherUserId;
    if (!otherUserId) {
      return NextResponse.json({ error: 'otherUserId is required' }, { status: 400 });
    }

    // Resolve current user as candidate or agent.
    const [{ data: meCandidate }, { data: meAgent }] = await Promise.all([
      supabase.from('candidates').select('id').eq('user_id', user.id).maybeSingle(),
      supabase.from('agents').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
    ]);

    let candidateId: string | null = null;
    let agentId: string | null = null;

    if (meCandidate?.id) {
      candidateId = meCandidate.id;
      const { data: otherAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', otherUserId)
        .eq('status', 'active')
        .maybeSingle();
      if (!otherAgent?.id) return NextResponse.json({ error: 'Other party must be an active agent' }, { status: 400 });
      agentId = otherAgent.id;
    } else if (meAgent?.id) {
      agentId = meAgent.id;
      const { data: otherCandidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', otherUserId)
        .maybeSingle();
      if (!otherCandidate?.id) return NextResponse.json({ error: 'Other party must be a candidate' }, { status: 400 });
      candidateId = otherCandidate.id;
    } else {
      return NextResponse.json({ error: 'You are neither a candidate nor an active agent' }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('candidate_id', candidateId)
      .eq('agent_id', agentId)
      .maybeSingle();

    let conversationId: string;
    if (existing?.id) {
      conversationId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          conversation_type: 'candidate_agent',
          candidate_id: candidateId,
          agent_id: agentId,
          is_active: true,
        } as any)
        .select('id')
        .single();
      if (error || !created) {
        return NextResponse.json({ error: error?.message || 'Failed to create conversation' }, { status: 500 });
      }
      conversationId = created.id;
    }

    if (initialMessage) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: initialMessage,
      } as any);
    }

    return NextResponse.json({ conversationId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
