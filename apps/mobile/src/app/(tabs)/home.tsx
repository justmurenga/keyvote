import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifications } from '@/hooks/useNotifications';
import { acceptAgentInvitation, markNotificationRead } from '@/services/notifications';
import { Card, Avatar, Badge } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { APP_NAME } from '@/constants';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { profile } = useAuthStore();
  const { unreadCount, latestBanner, dismissBanner, refresh: refreshNotifications, setUnreadCount, setNotifications } = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);
  const [acceptingInvite, setAcceptingInvite] = React.useState(false);
  const isFieldRole = ['candidate', 'agent', 'admin', 'super_admin'].includes(profile?.role || 'voter');

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleAcceptInviteBanner = async () => {
    if (!latestBanner) return;
    const token = latestBanner.metadata?.invitation_token;
    if (!token) return;
    setAcceptingInvite(true);
    const res = await acceptAgentInvitation(token);
    setAcceptingInvite(false);
    if (res.success) {
      await markNotificationRead(latestBanner.id);
      setNotifications((prev) => prev.map((x) => (x.id === latestBanner.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      dismissBanner();
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const quickActions = [
    {
      icon: 'people' as const,
      label: 'Candidates',
      color: colors.primary,
      bg: colors.primaryFaded,
      route: '/(tabs)/candidates' as const,
    },
    {
      icon: 'stats-chart' as const,
      label: 'Polls',
      color: colors.secondary,
      bg: colors.infoLight,
      route: '/(tabs)/polls' as const,
    },
    {
      icon: 'bar-chart' as const,
      label: 'Results',
      color: colors.warning,
      bg: colors.warningLight,
      route: '/(tabs)/results' as const,
    },
    {
      icon: 'heart' as const,
      label: 'Following',
      color: colors.error,
      bg: colors.errorLight,
      route: '/(tabs)/profile' as const,
    },
    {
      icon: 'chatbubbles' as const,
      label: 'Messages',
      color: colors.info,
      bg: colors.infoLight,
      route: '/messages' as const,
    },
    {
      icon: 'wallet' as const,
      label: 'Wallet',
      color: colors.success,
      bg: colors.successLight,
      route: '/wallet' as const,
    },
    ...(isFieldRole
      ? [
          {
            icon: 'clipboard' as const,
            label: 'Field Ops',
            color: colors.info,
            bg: colors.infoLight,
            route: '/(tabs)/field-ops' as const,
          },
        ]
      : []),
  ];

  const stats = [
    { label: 'Following', value: '0', icon: 'heart' as const },
    { label: 'Active Polls', value: '0', icon: 'stats-chart' as const },
    { label: 'Candidates', value: '0', icon: 'people' as const },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {greeting()} 👋
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {profile?.full_name || 'Mwananchi'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={styles.bellWrap}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: colors.error || '#ef4444' }]}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <Avatar
                uri={profile?.profile_photo_url}
                name={profile?.full_name || 'User'}
                size={44}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* In-app realtime banner: agent invitation */}
        {latestBanner && latestBanner.type === 'agent_invitation' && (
          <View style={[styles.inviteBanner, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
            <View style={[styles.inviteIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inviteTitle, { color: colors.text }]} numberOfLines={1}>
                {latestBanner.title}
              </Text>
              <Text style={[styles.inviteBody, { color: colors.textSecondary }]} numberOfLines={2}>
                {latestBanner.body}
              </Text>
              <View style={styles.inviteActions}>
                <TouchableOpacity
                  onPress={handleAcceptInviteBanner}
                  disabled={acceptingInvite}
                  style={[styles.inviteAccept, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.inviteAcceptText}>
                    {acceptingInvite ? 'Accepting…' : 'Accept'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={dismissBanner} style={styles.inviteDismiss}>
                  <Text style={[styles.inviteDismissText, { color: colors.textSecondary }]}>Later</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={dismissBanner} style={styles.inviteClose}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Completion Banner */}
        {(!profile?.polling_station_id) && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={[styles.banner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
            <Text style={[styles.bannerText, { color: colors.text }]}>
              Complete your profile to get personalized results
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Activity</Text>
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <View
              key={i}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name={stat.icon} size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Kenya Electoral Info */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Kenya Elections</Text>
        <Card style={{ marginBottom: Spacing.lg }}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: colors.primary }]}>47</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Counties</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: colors.primary }]}>290</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Constituencies</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoItem}>
              <Text style={[styles.infoValue, { color: colors.primary }]}>1,450</Text>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Wards</Text>
            </View>
          </View>
        </Card>

        {/* Electoral Positions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Electoral Positions</Text>
        {[
          { position: 'President', scope: 'National', icon: 'flag' },
          { position: 'Governor', scope: 'County', icon: 'business' },
          { position: 'Senator', scope: 'County', icon: 'briefcase' },
          { position: "Women's Rep", scope: 'County', icon: 'people' },
          { position: 'MP', scope: 'Constituency', icon: 'person' },
          { position: 'MCA', scope: 'Ward', icon: 'map' },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.positionRow, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push({
              pathname: '/(tabs)/candidates',
              params: { position: item.position.toLowerCase().replace(/[^a-z]/g, '_') },
            })}
          >
            <View style={[styles.posIcon, { backgroundColor: colors.primaryFaded }]}>
              <Ionicons name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={styles.posInfo}>
              <Text style={[styles.posTitle, { color: colors.text }]}>{item.position}</Text>
              <Text style={[styles.posScope, { color: colors.textSecondary }]}>{item.scope} Level</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerLeft: {},
  greeting: { fontSize: FontSize.sm },
  userName: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    gap: 8,
  },
  bannerText: { flex: 1, fontSize: FontSize.sm },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing['2xl'],
  },
  actionCard: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing['2xl'],
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  infoItem: { alignItems: 'center', flex: 1 },
  infoValue: { fontSize: FontSize['2xl'], fontWeight: '800' },
  infoLabel: { fontSize: FontSize.xs, marginTop: 2 },
  infoDivider: { width: 1, height: 40 },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  posIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  posInfo: { flex: 1 },
  posTitle: { fontSize: FontSize.base, fontWeight: '600' },
  posScope: { fontSize: FontSize.xs, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  inviteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteTitle: { fontSize: FontSize.base, fontWeight: '700' },
  inviteBody: { fontSize: FontSize.sm, marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  inviteAccept: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: BorderRadius.md },
  inviteAcceptText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  inviteDismiss: { paddingVertical: 6, paddingHorizontal: 10 },
  inviteDismissText: { fontWeight: '600', fontSize: FontSize.sm },
  inviteClose: { padding: 4 },
});
