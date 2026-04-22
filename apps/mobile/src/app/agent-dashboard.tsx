/**
 * Mobile parity for /dashboard/agent — read-only overview of agent's
 * assignments, submissions, and earnings using shared APIs.
 */
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { walletApi, reportsApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export default function AgentDashboardScreen() {
  const colors = useTheme();
  const profile = useAuthStore((s) => s.profile);

  const wallet = useQuery({ queryKey: ['wallet', 'summary'], queryFn: () => walletApi.summary() });
  const reports = useQuery({ queryKey: ['reports', 'mine'], queryFn: () => reportsApi.list() });

  if (wallet.isLoading || reports.isLoading) return <LoadingScreen message="Loading dashboard..." />;

  const balance = (wallet.data as any)?.wallet?.balance ?? 0;
  const reportCount = ((reports.data as any)?.reports || []).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Agent Dashboard' }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: Spacing.lg }}>
        <Card style={{ padding: Spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '700' }}>
            Welcome, {profile?.full_name || 'Agent'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 }}>
            Submit field reports and election results from the field.
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
          <Stat label="Wallet" value={`KES ${balance.toLocaleString()}`} icon="wallet" color="#10b981" colors={colors} />
          <Stat label="Reports" value={reportCount} icon="document-text" color="#3b82f6" colors={colors} />
        </View>

        <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: Spacing.sm }}>What you can do</Text>
          <Bullet text="Submit incident reports from your assigned region" colors={colors} />
          <Bullet text="Upload polling station results on election day" colors={colors} />
          <Bullet text="Receive M-Pesa payments to your registered number" colors={colors} />
          <Bullet text="View your submission history and earnings" colors={colors} />
        </Card>

        <Card style={{ padding: Spacing.lg, marginTop: Spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Need help?</Text>
          <Text style={{ color: colors.textSecondary }}>
            Contact your candidate or visit the web dashboard for advanced tools.
          </Text>
        </Card>
      </ScrollView>
    </>
  );
}

function Stat({ label, value, icon, color, colors }: any) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ color: colors.text, fontWeight: '700', marginTop: 6 }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs }}>{label}</Text>
    </View>
  );
}

function Bullet({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
      <Text style={{ color: colors.text, flex: 1 }}>{text}</Text>
    </View>
  );
}
