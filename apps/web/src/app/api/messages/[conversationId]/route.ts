import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';

const ADMIN_ROLES = ['admin', 'system_admin'];

// GET /api/messages/[conversationId] — Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    const supabase = createAdminClient();
    const isAdmin = ADMIN_ROLES.includes(user.role);

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, conversation_type, initiator_user_id, recipient_user_id, candidates(user_id), agents(user_id)')
      .eq('id', conversationId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const c: any = conv;
    const isCandidateUser = c.candidates?.user_id === user.id;
    const isAgentUser = c.agents?.user_id === user.id;
    const isInitiator = c.initiator_user_id === user.id;
    const isRecipient = c.recipient_user_id === user.id;

    if (!isCandidateUser && !isAgentUser && !isInitiator && !isRecipient && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');

    let query = supabase
      .from('messages')
      .select('*, sender:users!sender_id(id, full_name, role, avatar_url:profile_photo_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark messages as read for the viewer.
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (isCandidateUser) {
      await supabase.from('conversations').update({ candidate_unread_count: 0 } as any).eq('id', conversationId);
    } else if (isAgentUser) {
      await supabase.from('conversations').update({ agent_unread_count: 0 } as any).eq('id', conversationId);
    } else if (isInitiator) {
      await supabase.from('conversations').update({ initiator_unread_count: 0 } as any).eq('id', conversationId);
    } else if (isRecipient) {
      await supabase.from('conversations').update({ recipient_unread_count: 0 } as any).eq('id', conversationId);
    }

    return NextResponse.json({ messages: (data || []).reverse() });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/messages/[conversationId] — Archive a conversation (soft delete).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    const supabase = createAdminClient();
    const isAdmin = ADMIN_ROLES.includes(user.role);

    const { data: conv } = await supabase
      .from('conversations')
      .select('id, initiator_user_id, recipient_user_id, candidates(user_id), agents(user_id)')
      .eq('id', conversationId)
      .single();
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const c: any = conv;
    const allowed =
      isAdmin ||
      c.candidates?.user_id === user.id ||
      c.agents?.user_id === user.id ||
      c.initiator_user_id === user.id ||
      c.recipient_user_id === user.id;
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await supabase
      .from('conversations')
      .update({ is_active: false } as any)
      .eq('id', conversationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
