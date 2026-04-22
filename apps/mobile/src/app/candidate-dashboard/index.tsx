/**
 * Mobile parity for /dashboard/candidate (overview).
 * Pulls the same payload from /api/candidates/me via the shared client.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, Button, Card, LoadingScreen } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { candidatesApi, ApiError } from '@/lib/api-client';
import type { CandidateMeResponse } from '@/lib/api-client';

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

export default function CandidateDashboardOverview() {
  const colors = useTheme();
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery<CandidateMeResponse>({
    queryKey: ['candidate', 'me'],
    queryFn: () => candidatesApi.me(),
  });

  if (isLoading) return <LoadingScreen message="Loading dashboard..." />;

  if (error) {
    const apiErr = error as any;
    if (apiErr instanceof ApiError && apiErr.status === 404) {
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Ionicons name="megaphone-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.title, { color: colors.text, marginTop: 16 }]}>
            You{`'`}re not a candidate yet
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
            Register as a candidate to access campaign management tools.
          </Text>
          <Button
            title="Become a Candidate"
            style={{ marginTop: 24 }}
            onPress={() =>
              Alert.alert(
                'Become a Candidate',
                'Apply via the web app at dashboard/become-candidate',
              )
            }
          />
        </View>
      );
    }
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error, marginBottom: 12 }}>
          {(error as Error)?.message || 'Failed to load'}
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (!data) return null;
  const { candidate, stats, demographics } = data;
  const region =
    candidate.county?.name ||
    candidate.constituency?.name ||
    candidate.ward?.name ||
    'National';

  const statCards = [
    {
      label: 'Followers',
      value: stats.followerCount,
      icon: 'people',
      color: '#3b82f6',
      route: '/candidate-dashboard/analytics',
    },
    {
      label: 'Agents',
      value: stats.agentCount,
      icon: 'shield-checkmark',
      color: '#10b981',
      route: '/candidate-dashboard/agents',
    },
    {
      label: 'Active Polls',
      value: stats.activePollCount,
      icon: 'stats-chart',
      color: '#a855f7',
      route: '/candidate-dashboard/results',
    },
    {
      label: 'Recent Votes',
      value: stats.recentVotes,
      icon: 'trending-up',
      color: '#f97316',
      route: '/candidate-dashboard/results',
    },
  ];

  const quickActions = [
    { label: 'Edit Profile', icon: 'create', route: '/profile-edit' },
    { label: 'Manage Agents', icon: 'shield', route: '/candidate-dashboard/agents' },
    { label: 'Analytics', icon: 'analytics', route: '/candidate-dashboard/analytics' },
    { label: 'Messages', icon: 'chatbubbles', route: '/candidate-dashboard/messages' },
    { label: 'Results', icon: 'bar-chart', route: '/candidate-dashboard/results' },
    { label: 'Public Profile', icon: 'eye', route: `/candidate/${candidate.id}` },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80 }}>
      {/* Header card */}
      <Card style={{ padding: Spacing.lg, flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
        <Avatar uri={candidate.user.profile_photo_url} name={candidate.user.full_name} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '700' }} numberOfLines={1}>
            {candidate.user.full_name}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 }}>
            {POSITION_LABELS[candidate.position] || candidate.position} — {region}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            {candidate.is_verified ? (
              <Badge label="Verified" variant="success" />
            ) : (
              <Badge label={candidate.verification_status || 'pending'} variant="warning" />
            )}
            {candidate.party && (
              <Badge label={candidate.party.abbreviation} variant="default" />
            )}
          </View>
        </View>
      </Card>

      {/* Stat grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg }}>
        {statCards.map((s) => (
          <Pressable
            key={s.label}
            onPress={() => router.push(s.route as any)}
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.iconBubble, { backgroundColor: s.color + '22' }]}>
              <Ionicons name={s.icon as any} size={20} color={s.color} />
            </View>
            <Text style={{ color: colors.text, fontSize: FontSize.xl, fontWeight: '700', marginTop: 8 }}>
              {s.value}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {quickActions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => router.push(a.route as any)}
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name={a.icon as any} size={22} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '600', marginTop: 6, textAlign: 'center' }}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Slogan / manifesto preview */}
      {(candidate.campaign_slogan || candidate.manifesto_text) && (
        <Card style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
          {candidate.campaign_slogan && (
            <Text style={{ color: colors.text, fontStyle: 'italic', fontSize: FontSize.base }}>
              {`\u201C${candidate.campaign_slogan}\u201D`}
            </Text>
          )}
          {candidate.manifesto_text && (
            <Text
              numberOfLines={4}
              style={{ color: colors.textSecondary, marginTop: candidate.campaign_slogan ? Spacing.sm : 0 }}
            >
              {candidate.manifesto_text}
            </Text>
          )}
        </Card>
      )}

      {/* Demographics summary */}
      {(Object.keys(demographics.gender || {}).length > 0 ||
        Object.keys(demographics.age || {}).length > 0) && (
        <Card style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: Spacing.sm }}>
            Follower Demographics
          </Text>
          <DemoRows label="Gender" data={demographics.gender} colors={colors} />
          <View style={{ height: Spacing.sm }} />
          <DemoRows label="Age" data={demographics.age} colors={colors} />
        </Card>
      )}
    </ScrollView>
  );
}

function DemoRows({
  label,
  data,
  colors,
}: {
  label: string;
  data: Record<string, number>;
  colors: any;
}) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!entries.length) return null;
  return (
    <View>
      <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginBottom: 4 }}>
        {label}
      </Text>
      {entries.map(([k, v]) => {
        const pct = total ? Math.round((v / total) * 100) : 0;
        return (
          <View key={k} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, textTransform: 'capitalize' }}>
                {k.replace(/_/g, ' ')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {v} ({pct}%)
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: colors.borderLight, borderRadius: 2, marginTop: 2 }}>
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: colors.primary,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
});
