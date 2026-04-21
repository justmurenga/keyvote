import { supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Fetch notifications for the current user.
 */
export async function fetchNotifications(opts: { unreadOnly?: boolean; limit?: number } = {}) {
  const { unreadOnly = false, limit = 50 } = opts;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as AppNotification[];
}

export async function fetchUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);
}

/**
 * Subscribe to realtime notification inserts for the current user.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  userId: string,
  onNew: (n: AppNotification) => void,
) {
  const channel = supabase
    .channel(`notif:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) onNew(payload.new as AppNotification);
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      /* noop */
    }
  };
}

/**
 * Accept an agent invitation using its token.
 */
export async function acceptAgentInvitation(token: string) {
  // The web API supports `/api/agents/{token}/accept` because the route also
  // resolves by invitation_token. For mobile we hit it directly via Supabase
  // RPC for offline-friendliness when available, otherwise fall back to fetch.
  try {
    const { data, error } = await (supabase as any).rpc('accept_agent_invitation', {
      p_invitation_token: token,
    });
    if (error) throw error;
    return { success: data?.success !== false, message: data?.message, error: data?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to accept invitation' };
  }
}
