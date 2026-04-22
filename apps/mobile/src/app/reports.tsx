/** Mobile parity for /reports — list + create incident reports. */
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert, Modal, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Button, Card, LoadingScreen } from '@/components/ui';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { reportsApi, ApiError } from '@/lib/api-client';
import type { ReportItem } from '@/lib/api-client';

const CATEGORIES = [
  { value: 'voter_intimidation', label: 'Voter intimidation' },
  { value: 'bribery', label: 'Bribery' },
  { value: 'violence', label: 'Violence' },
  { value: 'irregularity', label: 'Irregularity' },
  { value: 'other', label: 'Other' },
];

export default function ReportsScreen() {
  const colors = useTheme();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'irregularity', title: '', description: '' });

  const { data, isLoading, refetch, isRefetching } = useQuery<{ reports: ReportItem[] }>({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list(),
  });

  const createMut = useMutation({
    mutationFn: () => reportsApi.create(form),
    onSuccess: () => {
      setOpen(false);
      setForm({ category: 'irregularity', title: '', description: '' });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (e: any) => Alert.alert('Error', e instanceof ApiError ? e.message : e?.message || 'Failed'),
  });

  if (isLoading) return <LoadingScreen message="Loading reports..." />;
  const items = data?.reports || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reports',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={() => setOpen(true)} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', padding: Spacing.xl }}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
              No reports filed. Tap + to report an incident.
            </Text>
          </View>
        ) : (
          items.map((r) => (
            <Card key={r.id} style={{ padding: Spacing.md, marginBottom: Spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs }}>{r.status}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2, textTransform: 'capitalize' }}>
                {r.category.replace(/_/g, ' ')} • {new Date(r.created_at).toLocaleDateString()}
              </Text>
              {r.description && (
                <Text style={{ color: colors.text, marginTop: 6 }} numberOfLines={3}>
                  {r.description}
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: FontSize.xl, fontWeight: '700' }}>New Report</Text>

          <Text style={{ color: colors.textSecondary, marginTop: Spacing.lg, marginBottom: 6 }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map((c) => {
              const sel = form.category === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => setForm((f) => ({ ...f, category: c.value }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: sel ? colors.primary : colors.border,
                    backgroundColor: sel ? colors.primaryFaded : 'transparent',
                  }}
                >
                  <Text style={{ color: sel ? colors.primary : colors.text }}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 }}>Title</Text>
          <TextInput
            value={form.title}
            onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
            placeholder="Short summary"
            placeholderTextColor={colors.textTertiary}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, padding: 10, color: colors.text }}
          />

          <Text style={{ color: colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 }}>Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
            placeholder="What happened, where, when..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={6}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: BorderRadius.md,
              padding: 10,
              color: colors.text,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
            <Button title="Cancel" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <Button
              title="Submit"
              onPress={() => createMut.mutate()}
              loading={createMut.isPending}
              disabled={!form.title.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </Modal>
    </>
  );
}
