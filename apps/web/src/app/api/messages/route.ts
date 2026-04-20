import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';

// GET /api/messages — List conversations for current user
// POST /api/messages — Send a message
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();

    // Get user's candidate or agent ID
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!candidate && !agent) {
      return NextResponse.json({ conversations: [] });
    }

    let query = supabase
      .from('conversations')
      .select(`
        *,
        candidates(id, users(id, full_name, phone, avatar_url)),
        agents(id, users(id, full_name, phone, avatar_url))
      `)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });

    if (candidate) {
      query = query.eq('candidate_id', candidate.id);
    } else if (agent) {
      query = query.eq('agent_id', agent.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
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

    // Verify user is part of conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, candidate_id, agent_id, candidates(user_id), agents(user_id)')
      .eq('id', conversationId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const isCandidateUser = (conv as any).candidates?.user_id === user.id;
    const isAgentUser = (conv as any).agents?.user_id === user.id;

    if (!isCandidateUser && !isAgentUser) {
      return NextResponse.json({ error: 'You are not part of this conversation' }, { status: 403 });
    }

    // Insert message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update unread count for the other party
    if (isCandidateUser) {
      await (supabase.rpc as any)('increment_field', { row_id: conversationId, table_name: 'conversations', field_name: 'agent_unread_count' }).catch(() => {
        // Fallback: direct update
        supabase.from('conversations').update({ agent_unread_count: (conv as any).agent_unread_count + 1 } as any).eq('id', conversationId);
      });
    } else {
      await (supabase.rpc as any)('increment_field', { row_id: conversationId, table_name: 'conversations', field_name: 'candidate_unread_count' }).catch(() => {
        supabase.from('conversations').update({ candidate_unread_count: (conv as any).candidate_unread_count + 1 } as any).eq('id', conversationId);
      });
    }

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
