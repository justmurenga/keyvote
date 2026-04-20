import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';

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

    // Verify user is participant
    const { data: conv } = await supabase
      .from('conversations')
      .select('id, candidates(user_id), agents(user_id)')
      .eq('id', conversationId)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const isCandidateUser = (conv as any).candidates?.user_id === user.id;
    const isAgentUser = (conv as any).agents?.user_id === user.id;
    if (!isCandidateUser && !isAgentUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // cursor for pagination

    let query = supabase
      .from('messages')
      .select('*, sender:users!sender_id(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    // Reset unread count
    if (isCandidateUser) {
      await supabase.from('conversations').update({ candidate_unread_count: 0 }).eq('id', conversationId);
    } else {
      await supabase.from('conversations').update({ agent_unread_count: 0 }).eq('id', conversationId);
    }

    return NextResponse.json({ messages: (data || []).reverse() });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
