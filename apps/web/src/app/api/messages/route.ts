import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';

const ADMIN_ROLES = ['admin', 'system_admin'];

// GET /api/messages — List conversations for current user
//   ?scope=mine (default) | all (admins only — moderation view)
// POST /api/messages — Send a message in an existing conversation
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'all' ? 'all' : 'mine';

    const supabase = createAdminClient();
    const isAdmin = ADMIN_ROLES.includes(user.role);

    const [{ data: candidate }, { data: agent }] = await Promise.all([
      supabase.from('candidates').select('id').eq('user_id', user.id).maybeSingle(),
      supabase.from('agents').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
    ]);

    const baseSelect = `
      *,
      candidates(id, users(id, full_name, phone, avatar_url:profile_photo_url)),
      agents(id, users(id, full_name, phone, avatar_url:profile_photo_url)),
      initiator:users!conversations_initiator_user_id_fkey(id, full_name, phone, role, avatar_url:profile_photo_url),
      recipient:users!conversations_recipient_user_id_fkey(id, full_name, phone, role, avatar_url:profile_photo_url)
    `;

    let query = supabase
      .from('conversations')
      .select(baseSelect)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (isAdmin && scope === 'all') {
      query = query.limit(200);
    } else {
      const ors: string[] = [];
      if (candidate?.id) ors.push(`candidate_id.eq.${candidate.id}`);
      if (agent?.id) ors.push(`agent_id.eq.${agent.id}`);
      ors.push(`initiator_user_id.eq.${user.id}`);
      ors.push(`recipient_user_id.eq.${user.id}`);
      query = query.or(ors.join(','));
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      conversations: data || [],
      meta: { isAdmin, scope, currentUserId: user.id },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { conversationId, content, mediaUrl, mediaType } = body;

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const isAdmin = ADMIN_ROLES.includes(user.role);

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, conversation_type, candidate_id, agent_id, initiator_user_id, recipient_user_id, candidates(user_id), agents(user_id)')
      .eq('id', conversationId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const c: any = conv;
    const isCandidateUser = c.candidates?.user_id === user.id;
    const isAgentUser = c.agents?.user_id === user.id;
    const isInitiator = c.initiator_user_id === user.id;
    const isRecipient = c.recipient_user_id === user.id;

    if (!isCandidateUser && !isAgentUser && !isInitiator && !isRecipient && !isAdmin) {
      return NextResponse.json({ error: 'You are not part of this conversation' }, { status: 403 });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      } as any)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // DB trigger handles unread counters for both conversation types.
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
