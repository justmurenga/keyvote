/** Mobile parity for /wallet — balance + transaction history. */
import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { walletApi } from '@/lib/api-client';

export default function WalletScreen() {
  const colors = useTheme();
  const summary = useQuery({ queryKey: ['wallet', 'summary'], queryFn: () => walletApi.summary() });
  const txns = useQuery({ queryKey: ['wallet', 'transactions'], queryFn: () => walletApi.transactions() });

  if (summary.isLoading) return <LoadingScreen message="Loading wallet..." />;
  const balance = (summary.data as any)?.wallet?.balance ?? 0;
  const currency = (summary.data as any)?.wallet?.currency ?? 'KES';
  const items = (txns.data as any)?.transactions || [];

  return (
    <>
      <Stack.Screen options={{ title: 'Wallet', headerShown: true }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || txns.isRefetching}
            onRefresh={() => {
              summary.refetch();
              txns.refetch();
            }}
          />
        }
      >
        <Card style={{ padding: Spacing.lg, backgroundColor: colors.primary }}>
          <Text style={{ color: 'white', opacity: 0.9 }}>Available Balance</Text>
          <Text style={{ color: 'white', fontSize: 32, fontWeight: '700', marginTop: 6 }}>
            {currency} {balance.toLocaleString()}
          </Text>
        </Card>

        <Text style={{ color: colors.text, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          Recent Transactions
        </Text>
        {items.length === 0 ? (
          <Card style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <Ionicons name="receipt-outline" size={42} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No transactions yet</Text>
          </Card>
        ) : (
          items.map((t: any) => (
            <Card key={t.id} style={{ padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                  {t.description || t.type}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 }}>
                  {new Date(t.created_at).toLocaleString()}
                </Text>
              </View>
              <Text
                style={{
                  color: t.amount >= 0 ? colors.success : colors.error,
                  fontWeight: '700',
                  alignSelf: 'center',
                }}
              >
                {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}
