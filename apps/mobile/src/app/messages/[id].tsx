/**
 * Mobile parity for /dashboard/messages/[conversationId] — single thread view
 * with live message list and a composer. Reuses the shared `messagesApi`
 * (`thread` + `sendInConversation`) so the wire format stays identical to
 * the web inbox.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Avatar, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { messagesApi, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { ConversationMessage } from '@/lib/api-client';
import { playSentSound, playNotificationSound } from '@/lib/sound';

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id || s.profile?.id);

  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const [draft, setDraft] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messagesApi.thread(String(id)),
    enabled: !!id,
    refetchInterval: 8_000, // live-feel poll; the same /api endpoint as web
  });

  const messages: ConversationMessage[] = (data as any)?.messages || [];

  // Play the incoming chime/haptic when a brand-new (non-self) message
  // arrives via the polling refresh — mirrors the web behaviour.
  useEffect(() => {
    if (!messages.length) return;
    const newest = messages[messages.length - 1];
    if (lastSeenIdRef.current === newest.id) return;
    if (lastSeenIdRef.current !== null && newest.sender_id !== userId) {
      playNotificationSound();
    }
    lastSeenIdRef.current = newest.id;
    // Auto-scroll on new messages.
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, userId]);

  const sendMut = useMutation({
    mutationFn: () =>
      messagesApi.sendInConversation({ conversationId: String(id), content: draft.trim() }),
    onSuccess: () => {
      setDraft('');
      playSentSound();
      qc.invalidateQueries({ queryKey: ['conversation', id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) => {
      // eslint-disable-next-line no-alert
      const msg = e instanceof ApiError ? e.message : e?.message || 'Failed to send';
      // Defer to RN Alert via dynamic import to avoid pulling Alert at module top.
      import('react-native').then((rn) => rn.Alert.alert('Send failed', msg));
    },
  });

  if (isLoading) return <LoadingScreen message="Loading conversation..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'Conversation', headerShown: true }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => {
            const mine = item.sender_id === userId;
            return (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 8,
                }}
              >
                {!mine && (
                  <Avatar
                    uri={item.sender?.avatar_url ?? null}
                    name={item.sender?.full_name || 'User'}
                    size={28}
                  />
                )}
                <View
                  style={{
                    maxWidth: '78%',
                    backgroundColor: mine ? colors.primary : colors.surface,
                    borderRadius: BorderRadius.lg,
                    padding: Spacing.md,
                  }}
                >
                  <Text style={{ color: mine ? 'white' : colors.text }}>{item.content}</Text>
                  <Text
                    style={{
                      color: mine ? 'rgba(255,255,255,0.75)' : colors.textTertiary,
                      fontSize: FontSize.xs,
                      marginTop: 4,
                      textAlign: 'right',
                    }}
                  >
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: Spacing.xl }}>
              <Ionicons name="chatbubble-ellipses-outline" size={42} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                No messages in this conversation yet. Say hello below.
              </Text>
            </View>
          }
        />

        {/* Composer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            padding: Spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            gap: Spacing.sm,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: BorderRadius.lg,
              paddingHorizontal: 12,
              paddingVertical: 8,
              maxHeight: 120,
              color: colors.text,
              backgroundColor: colors.surface,
            }}
          />
          <Pressable
            onPress={() => draft.trim() && sendMut.mutate()}
            disabled={!draft.trim() || sendMut.isPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: draft.trim() ? colors.primary : colors.borderLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sendMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
