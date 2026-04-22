import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize } from '@/constants/theme';
import { candidatesApi } from '@/lib/api-client';
import type { CandidateMeResponse } from '@/lib/api-client';

export default function AnalyticsScreen() {
  const colors = useTheme();
  const { data, isLoading } = useQuery<CandidateMeResponse>({
    queryKey: ['candidate', 'me'],
    queryFn: () => candidatesApi.me(),
  });

  if (isLoading) return <LoadingScreen message="Loading analytics..." />;
  if (!data) return null;

  const { stats, demographics } = data;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: Spacing.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {[
          { label: 'Followers', value: stats.followerCount, color: '#3b82f6' },
          { label: 'Agents', value: stats.agentCount, color: '#10b981' },
          { label: 'Active Polls', value: stats.activePollCount, color: '#a855f7' },
          { label: 'Recent Votes (7d)', value: stats.recentVotes, color: '#f97316' },
        ].map((s) => (
          <Card key={s.label} style={{ flexBasis: '48%', flexGrow: 1, padding: Spacing.md }}>
            <Text style={{ color: s.color, fontSize: FontSize['2xl'], fontWeight: '700' }}>{s.value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs }}>{s.label}</Text>
          </Card>
        ))}
      </View>

      <DemoBlock title="By Gender" data={demographics.gender} colors={colors} />
      <DemoBlock title="By Age Bracket" data={demographics.age} colors={colors} />
    </ScrollView>
  );
}

function DemoBlock({ title, data, colors }: { title: string; data: Record<string, number>; colors: any }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!entries.length) return null;
  return (
    <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
      <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
      {entries.map(([k, v]) => {
        const pct = total ? Math.round((v / total) * 100) : 0;
        return (
          <View key={k} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</Text>
              <Text style={{ color: colors.textSecondary }}>{v} ({pct}%)</Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.borderLight, borderRadius: 3, marginTop: 2 }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}
