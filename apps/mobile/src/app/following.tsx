/** Mobile parity for /following — list candidates the user follows. */
import React from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize } from '@/constants/theme';
import { followingApi } from '@/lib/api-client';
import type { FollowingItem } from '@/lib/api-client';

export default function FollowingScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery<{ following: FollowingItem[] }>({
    queryKey: ['following'],
    queryFn: () => followingApi.list(),
  });

  if (isLoading) return <LoadingScreen message="Loading..." />;
  const items = data?.following || [];

  return (
    <>
      <Stack.Screen options={{ title: 'Following', headerShown: true }} />
      {items.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="heart-outline" size={48} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            You{`'`}re not following any candidates yet. Browse candidates to follow.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ backgroundColor: colors.background }}
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/candidate/${item.candidate.id}` as any)}>
              <Card style={{ padding: Spacing.md, flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
                <Avatar uri={item.candidate.user.profile_photo_url} name={item.candidate.user.full_name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                    {item.candidate.user.full_name}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                    {item.candidate.position} • {item.candidate.party?.abbreviation || 'Independent'}
                  </Text>
                  {item.candidate.is_verified && <Badge label="Verified" variant="success" />}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Card>
            </Pressable>
          )}
        />
      )}
    </>
  );
}
