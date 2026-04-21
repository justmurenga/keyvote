import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications } from '@/hooks/useNotifications';
import {
  acceptAgentInvitation,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  agent_invitation: 'shield-checkmark',
  agent_revoked: 'shield-half',
  poll_result: 'stats-chart',
  campaign_update: 'megaphone',
  payment: 'cash',
  system: 'information-circle',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { notifications, loading, refresh, setNotifications, setUnreadCount } = useNotifications();
  const [busyId, setBusyId] = useState<string | null>(null);

  const onMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const onAcceptInvitation = async (n: AppNotification) => {
    const token = n.metadata?.invitation_token;
    if (!token) {
      Alert.alert('Error', 'Invitation token missing');
      return;
    }
    setBusyId(n.id);
    const res = await acceptAgentInvitation(token);
    setBusyId(null);
    if (res.success) {
      Alert.alert('Welcome aboard!', res.message || 'You are now a campaign agent.');
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      refresh();
    } else {
      Alert.alert('Could not accept', res.error || 'Please try again later');
    }
  };

  const onPressNotification = async (n: AppNotification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.type === 'agent_invitation') {
      Alert.alert(
        n.title,
        n.body,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Accept', onPress: () => onAcceptInvitation(n) },
        ],
      );
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const iconName = ICONS[item.type] || 'notifications';
    const isInvitation = item.type === 'agent_invitation';
    return (
      <TouchableOpacity
        onPress={() => onPressNotification(item)}
        activeOpacity={0.7}
        style={[
          styles.item,
          {
            backgroundColor: item.is_read ? colors.card : colors.primaryFaded,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryFaded }]}>
          <Ionicons name={iconName} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.body}
          </Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo(item.created_at)}</Text>

          {isInvitation && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                disabled={busyId === item.id}
                onPress={() => onAcceptInvitation(item)}
                style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
              >
                {busyId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept Invitation</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={onMarkAllRead} style={styles.iconBtn}>
          <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              When candidates invite you as an agent or there are campaign updates, they will show up here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  markAll: { fontSize: FontSize.sm, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.base, fontWeight: '700', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  body: { fontSize: FontSize.sm, marginTop: 2 },
  time: { fontSize: FontSize.xs, marginTop: 4 },
  actionsRow: { flexDirection: 'row', marginTop: Spacing.sm },
  acceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minWidth: 160,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md },
  emptyBody: { fontSize: FontSize.sm, marginTop: Spacing.sm, textAlign: 'center' },
});
