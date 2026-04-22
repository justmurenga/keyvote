/** Mobile parity for /wallet — balance + history + topup/withdraw/transfer. */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Button, Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { walletApi, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type ActionMode = 'topup' | 'withdraw' | 'transfer';

export default function WalletScreen() {
  const colors = useTheme();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  const summary = useQuery({ queryKey: ['wallet', 'summary'], queryFn: () => walletApi.summary() });
  const txns = useQuery({ queryKey: ['wallet', 'transactions'], queryFn: () => walletApi.transactions() });

  const [mode, setMode] = useState<ActionMode | null>(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');

  const closeModal = () => {
    setMode(null);
    setAmount('');
    setPhone('');
    setRecipient('');
    setNote('');
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['wallet'] });
    summary.refetch();
    txns.refetch();
  };

  // All actions reuse the shared walletApi (same endpoints as the web).
  const topupMut = useMutation({
    mutationFn: () => walletApi.topup(Number(amount), phone || profile?.phone || undefined),
    onSuccess: () => {
      Alert.alert('Top-up requested', 'Check your phone for the M-Pesa STK Push prompt.');
      closeModal();
      refreshAll();
    },
    onError: (e: any) =>
      Alert.alert('Top-up failed', e instanceof ApiError ? e.message : e?.message || 'Try again'),
  });

  const withdrawMut = useMutation({
    mutationFn: () => walletApi.withdraw(Number(amount), phone || profile?.phone || undefined),
    onSuccess: () => {
      Alert.alert('Withdrawal requested', 'You will receive an M-Pesa confirmation shortly.');
      closeModal();
      refreshAll();
    },
    onError: (e: any) =>
      Alert.alert('Withdrawal failed', e instanceof ApiError ? e.message : e?.message || 'Try again'),
  });

  const transferMut = useMutation({
    mutationFn: () =>
      walletApi.transfer({ amount: Number(amount), recipient, note: note || undefined }),
    onSuccess: () => {
      Alert.alert('Transfer sent', 'The recipient will see the funds in their wallet.');
      closeModal();
      refreshAll();
    },
    onError: (e: any) =>
      Alert.alert('Transfer failed', e instanceof ApiError ? e.message : e?.message || 'Try again'),
  });

  if (summary.isLoading) return <LoadingScreen message="Loading wallet..." />;

  const balance = (summary.data as any)?.wallet?.balance ?? 0;
  const currency = (summary.data as any)?.wallet?.currency ?? 'KES';
  const items = (txns.data as any)?.transactions || [];

  const submit = () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }
    if (mode === 'topup') topupMut.mutate();
    else if (mode === 'withdraw') withdrawMut.mutate();
    else if (mode === 'transfer') {
      if (!recipient.trim()) {
        Alert.alert('Recipient required', 'Enter the recipient phone or user id.');
        return;
      }
      transferMut.mutate();
    }
  };

  const isPending = topupMut.isPending || withdrawMut.isPending || transferMut.isPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Wallet', headerShown: true }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || txns.isRefetching}
            onRefresh={refreshAll}
          />
        }
      >
        <Card style={{ padding: Spacing.lg, backgroundColor: colors.primary }}>
          <Text style={{ color: 'white', opacity: 0.9 }}>Available Balance</Text>
          <Text style={{ color: 'white', fontSize: 32, fontWeight: '700', marginTop: 6 }}>
            {currency} {Number(balance).toLocaleString()}
          </Text>
        </Card>

        {/* Action buttons — same flow as the web wallet */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
          <ActionTile
            icon="arrow-down-circle"
            label="Top Up"
            color={colors.success}
            bg={colors.successLight}
            onPress={() => setMode('topup')}
          />
          <ActionTile
            icon="arrow-up-circle"
            label="Withdraw"
            color={colors.warning}
            bg={colors.warningLight}
            onPress={() => setMode('withdraw')}
          />
          <ActionTile
            icon="swap-horizontal"
            label="Send"
            color={colors.info}
            bg={colors.infoLight}
            onPress={() => setMode('transfer')}
          />
        </View>

        <Text
          style={{
            color: colors.text,
            fontWeight: '700',
            marginTop: Spacing.lg,
            marginBottom: Spacing.sm,
          }}
        >
          Recent Transactions
        </Text>
        {items.length === 0 ? (
          <Card style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <Ionicons name="receipt-outline" size={42} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No transactions yet</Text>
          </Card>
        ) : (
          items.map((t: any) => (
            <Card
              key={t.id}
              style={{
                padding: Spacing.md,
                marginBottom: Spacing.sm,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
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
                {t.amount >= 0 ? '+' : ''}
                {Number(t.amount).toLocaleString()}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Action modal */}
      <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.background,
              padding: Spacing.lg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: FontSize.lg,
                fontWeight: '700',
                marginBottom: Spacing.md,
              }}
            >
              {mode === 'topup' && 'Top Up Wallet'}
              {mode === 'withdraw' && 'Withdraw to M-Pesa'}
              {mode === 'transfer' && 'Send Funds'}
            </Text>

            <FormField label="Amount (KES)" colors={colors}>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="e.g. 500"
                placeholderTextColor={colors.textTertiary}
                style={inputStyle(colors)}
              />
            </FormField>

            {mode === 'transfer' ? (
              <>
                <FormField label="Recipient phone or user ID" colors={colors}>
                  <TextInput
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="07XXXXXXXX"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    style={inputStyle(colors)}
                  />
                </FormField>
                <FormField label="Note (optional)" colors={colors}>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="What is this for?"
                    placeholderTextColor={colors.textTertiary}
                    style={inputStyle(colors)}
                  />
                </FormField>
              </>
            ) : (
              <FormField label="M-Pesa phone (optional)" colors={colors}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={profile?.phone || '07XXXXXXXX'}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  style={inputStyle(colors)}
                />
              </FormField>
            )}

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
              <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={closeModal} />
              <Button
                title={isPending ? 'Working...' : 'Confirm'}
                loading={isPending}
                disabled={isPending}
                style={{ flex: 1 }}
                onPress={submit}
              />
            </View>

            {isPending && (
              <View style={{ marginTop: Spacing.md, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

function ActionTile({
  icon,
  label,
  color,
  bg,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: bg,
        paddingVertical: 14,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
      }}
    >
      <Ionicons name={icon} size={24} color={color} />
      <Text style={{ color, fontWeight: '700', marginTop: 4, fontSize: FontSize.sm }}>{label}</Text>
    </Pressable>
  );
}

function FormField({
  label,
  colors,
  children,
}: {
  label: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: FontSize.xs,
          fontWeight: '600',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function inputStyle(colors: any) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: FontSize.base,
    backgroundColor: colors.surface,
  };
}
