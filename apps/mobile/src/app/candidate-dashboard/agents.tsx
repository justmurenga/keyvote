/**
 * Mobile parity for /dashboard/agents — list, search, status filter, revoke.
 * Powered by the shared `agentsApi`.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, Button, Card, LoadingScreen } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { agentsApi, ApiError } from '@/lib/api-client';
import type { AgentData, AgentStatus } from '@/lib/api-client';

const STATUS_TABS: Array<{ key: 'all' | AgentStatus; label: string; color: string }> = [
  { key: 'all', label: 'All', color: '#6b7280' },
  { key: 'active', label: 'Active', color: '#10b981' },
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'suspended', label: 'Suspended', color: '#f97316' },
  { key: 'revoked', label: 'Revoked', color: '#ef4444' },
];

export default function AgentsScreen() {
  const colors = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'all' | AgentStatus>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery<{ agents: AgentData[] }>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => agentsApi.revoke(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
    onError: (err: any) =>
      Alert.alert('Error', err instanceof ApiError ? err.message : err?.message || 'Failed'),
  });

  const filtered = useMemo(() => {
    const all = data?.agents || [];
    return all.filter((a) => {
      const tabOk = tab === 'all' || a.status === tab;
      const q = search.trim().toLowerCase();
      const sOk =
        !q ||
        a.full_name?.toLowerCase().includes(q) ||
        a.phone_number?.toLowerCase().includes(q) ||
        a.region_name?.toLowerCase().includes(q);
      return tabOk && sOk;
    });
  }, [data, tab, search]);

  const stats = useMemo(() => {
    const a = data?.agents || [];
    return {
      total: a.length,
      active: a.filter((x) => x.status === 'active').length,
      pending: a.filter((x) => x.status === 'pending').length,
      suspended: a.filter((x) => x.status === 'suspended').length,
      revoked: a.filter((x) => x.status === 'revoked').length,
    };
  }, [data]);

  if (isLoading) return <LoadingScreen message="Loading agents..." />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Stats strip */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <StatCell label="Total" value={stats.total} colors={colors} />
        <StatCell label="Active" value={stats.active} valueColor="#10b981" colors={colors} />
        <StatCell label="Pending" value={stats.pending} valueColor="#f59e0b" colors={colors} />
        <StatCell label="Revoked" value={stats.revoked} valueColor="#ef4444" colors={colors} />
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search agents..."
          placeholderTextColor={colors.textTertiary}
          style={{ flex: 1, color: colors.text, paddingVertical: 8 }}
        />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.sm, paddingVertical: Spacing.sm }}
      >
        {STATUS_TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: selected ? t.color : colors.border,
                backgroundColor: selected ? t.color + '22' : 'transparent',
              }}
            >
              <Text style={{ color: selected ? t.color : colors.text, fontWeight: '600', fontSize: FontSize.sm }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <Card style={{ padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.lg }}>
          <Ionicons name="shield-outline" size={48} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            {search
              ? 'No agents match your search'
              : 'No agents yet. Use the web app to invite your first agent.'}
          </Text>
        </Card>
      ) : (
        filtered.map((a) => (
          <AgentCard
            key={a.agent_id}
            agent={a}
            colors={colors}
            onRevoke={(reason) => revoke.mutate({ id: a.agent_id, reason })}
          />
        ))
      )}
    </ScrollView>
  );
}

function StatCell({
  label,
  value,
  valueColor,
  colors,
}: {
  label: string;
  value: number;
  valueColor?: string;
  colors: any;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: valueColor || colors.text, fontSize: FontSize.xl, fontWeight: '700' }}>
        {value}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs }}>{label}</Text>
    </View>
  );
}

function AgentCard({
  agent,
  colors,
  onRevoke,
}: {
  agent: AgentData;
  colors: any;
  onRevoke: (reason?: string) => void;
}) {
  const statusColor =
    agent.status === 'active'
      ? '#10b981'
      : agent.status === 'pending'
      ? '#f59e0b'
      : agent.status === 'suspended'
      ? '#f97316'
      : '#ef4444';

  return (
    <Card style={{ padding: Spacing.md, marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.md }}>
      <Avatar uri={agent.profile_photo_url} name={agent.full_name || 'Agent'} size={48} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
            {agent.full_name || 'Pending invite'}
          </Text>
          <Badge label={agent.status} variant="default" />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 }}>
          {agent.phone_number || agent.invited_phone || 'No phone'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs }}>
            {agent.region_name} • {agent.assigned_region_type}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 8 }}>
          <Mini label="Reports" value={agent.total_reports} colors={colors} />
          <Mini label="Results" value={agent.total_results_submitted} colors={colors} />
          <Mini label="Paid" value={`KES ${agent.total_payments_received}`} colors={colors} />
        </View>
        {(agent.status === 'active' || agent.status === 'pending') && (
          <Pressable
            onPress={() =>
              Alert.alert('Revoke agent', `Revoke ${agent.full_name}?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Revoke',
                  style: 'destructive',
                  onPress: () => onRevoke('Revoked from mobile app'),
                },
              ])
            }
            style={{
              marginTop: 8,
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: BorderRadius.md,
              borderWidth: 1,
              borderColor: '#ef4444',
            }}
          >
            <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: FontSize.xs }}>Revoke</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

function Mini({ label, value, colors }: { label: string; value: any; colors: any }) {
  return (
    <View>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: FontSize.sm }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
