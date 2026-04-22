import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, FlatList, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, Button, Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { messagesApi } from '@/lib/api-client';

export default function MessagesScreen() {
  const colors = useTheme();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['messages', 'inbox'],
    queryFn: () => messagesApi.list(),
  });

  const [reply, setReply] = useState('');
  const [recipient, setRecipient] = useState<string | null>(null);

  const sendMut = useMutation({
    mutationFn: () => messagesApi.send({ recipient_id: recipient!, body: reply }),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  if (isLoading) return <LoadingScreen message="Loading messages..." />;

  const items = (data as any)?.messages || [];

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
          No messages yet. Voters who follow you can start conversations here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(m: any) => m.id}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setRecipient(item.sender_id)}>
            <Card style={{ padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm }}>
              <Avatar uri={null} name="Voter" size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                  {item.body}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              {!item.read_at && <View style={{ width: 8, height: 8, backgroundColor: colors.primary, borderRadius: 4, alignSelf: 'center' }} />}
            </Card>
          </Pressable>
        )}
      />
      {recipient && (
        <View style={{ padding: Spacing.md, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder="Reply..."
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 10 }}
          />
          <Button title="Send" onPress={() => sendMut.mutate()} disabled={!reply.trim() || sendMut.isPending} />
        </View>
      )}
    </View>
  );
}
