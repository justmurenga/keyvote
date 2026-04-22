import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize } from '@/constants/theme';
import { resultsApi } from '@/lib/api-client';
import type { ResultItem } from '@/lib/api-client';

export default function ResultsScreen() {
  const colors = useTheme();
  const { data, isLoading, refetch, isRefetching } = useQuery<{ results: ResultItem[] }>({
    queryKey: ['results', 'me'],
    queryFn: () => resultsApi.list(),
  });

  if (isLoading) return <LoadingScreen message="Loading results..." />;
  const results = data?.results || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {results.length === 0 ? (
        <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            No election results published yet.
          </Text>
        </View>
      ) : (
        results.map((r, idx) => (
          <Card key={`${r.position}-${r.region_name}-${idx}`} style={{ padding: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700', textTransform: 'capitalize' }}>
                {r.position} — {r.region_name}
              </Text>
              <Text style={{ color: r.status === 'final' ? colors.success : colors.warning, fontSize: FontSize.xs, fontWeight: '700' }}>
                {r.status.toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
              {r.stations_reported}/{r.total_stations} stations • {r.total_votes.toLocaleString()} votes
            </Text>
            <View style={{ marginTop: Spacing.sm, gap: 6 }}>
              {r.candidates.map((c) => (
                <View key={c.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text }} numberOfLines={1}>
                      {c.name} ({c.party})
                    </Text>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{c.percentage.toFixed(1)}%</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.borderLight, borderRadius: 3, marginTop: 2 }}>
                    <View
                      style={{
                        width: `${Math.min(100, c.percentage)}%`,
                        height: '100%',
                        backgroundColor: c.party_color || colors.primary,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
