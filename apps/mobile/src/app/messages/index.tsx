/**
 * Mobile parity for /dashboard/messages — list of the user's conversations
 * (candidate↔agent threads, admin↔user threads). Tapping a row opens the
 * thread screen at /messages/[id].
 *
 * Backed by the shared `messagesApi.conversations` endpoint so the same
 * API powers web and mobile.
 */
import React from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Avatar, Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize } from '@/constants/theme';
import { messagesApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { ConversationItem } from '@/lib/api-client';

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function describePeer(c: ConversationItem, currentUserId?: string): { name: string; avatar: string | null; role: string } {
  // candidate ↔ agent threads
  if (c.conversation_type === 'candidate_agent') {
    const candidateUser = (c.candidates as any)?.users;
    const agentUser = (c.agents as any)?.users;
    const peer = currentUserId && candidateUser?.id === currentUserId ? agentUser : candidateUser;
    return {
      name: peer?.full_name || (peer === agentUser ? 'Agent' : 'Candidate'),
      avatar: peer?.avatar_url ?? null,
      role: peer === agentUser ? 'Agent' : 'Candidate',
    };
  }
  // admin ↔ user threads
  const peer = c.initiator_user_id === currentUserId ? c.recipient : c.initiator;
  return {
    name: peer?.full_name || 'Conversation',
    avatar: peer?.avatar_url ?? null,
    role: peer?.role || '—',
  };
}

function unreadFor(c: ConversationItem, currentUserId?: string): number {
  if (c.conversation_type === 'candidate_agent') {
    const candidateUserId = (c.candidates as any)?.users?.id;
    if (currentUserId && candidateUserId === currentUserId) return c.candidate_unread_count || 0;
    return c.agent_unread_count || 0;
  }
  if (c.initiator_user_id === currentUserId) return c.initiator_unread_count || 0;
  if (c.recipient_user_id === currentUserId) return c.recipient_unread_count || 0;
  return 0;
}

export default function ConversationsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id || s.profile?.id || undefined);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.conversations(),
    refetchInterval: 30_000,
  });

  const items: ConversationItem[] = (data as any)?.conversations || [];

  if (isLoading) return <LoadingScreen message="Loading messages..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'Messages', headerShown: true }} />
      {items.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            No conversations yet. They will appear here when a candidate, agent, or admin messages you.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => {
            const peer = describePeer(item, userId);
            const unread = unreadFor(item, userId);
            return (
              <Pressable onPress={() => router.push(`/messages/${item.id}` as any)}>
                <Card style={{ padding: Spacing.md, flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
                  <Avatar uri={peer.avatar} name={peer.name} size={48} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                        {peer.name}
                      </Text>
                      <Text style={{ color: colors.textTertiary, fontSize: FontSize.xs, marginLeft: 8 }}>
                        {timeAgo(item.last_message_at)}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 }} numberOfLines={1}>
                      {peer.role} • {item.last_message_preview || item.subject || 'No messages yet'}
                    </Text>
                  </View>
                  {unread > 0 && (
                    <View style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: FontSize.xs, fontWeight: '700' }}>
                        {unread > 9 ? '9+' : unread}
                      </Text>
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </>
  );
}
