import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { Avatar, Badge, Card, Button } from '@/components/ui';
import { POSITION_LABELS, GENDER_LABELS } from '@/constants';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import {
  isBiometricSupported,
  isBiometricEnrolled,
  isBiometricLoginEnabled,
  getBiometricTypes,
  getBiometricTypeName,
} from '@/lib/biometric-auth';

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { profile, signOut, isAuthenticated, enableBiometric, disableBiometric } = useAuthStore();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const supported = await isBiometricSupported();
    const enrolled = await isBiometricEnrolled();
    const enabled = await isBiometricLoginEnabled();
    const types = await getBiometricTypes();
    
    setBiometricAvailable(supported && enrolled);
    setBiometricEnabled(enabled);
    setBiometricType(getBiometricTypeName(types));
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!profile?.phone || !profile?.id) {
      Alert.alert('Error', 'Unable to enable biometric login');
      return;
    }

    setIsBiometricLoading(true);

    if (value) {
      const result = await enableBiometric(profile.phone, profile.id);
      if (result.error) {
        Alert.alert('Error', result.error);
        setIsBiometricLoading(false);
        return;
      }
      setBiometricEnabled(true);
      Alert.alert('Success', `${biometricType} login enabled`);
    } else {
      const result = await disableBiometric();
      if (result.error) {
        Alert.alert('Error', result.error);
        setIsBiometricLoading(false);
        return;
      }
      setBiometricEnabled(false);
      Alert.alert('Success', `${biometricType} login disabled`);
    }

    setIsBiometricLoading(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  if (!isAuthenticated || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.notLoggedIn}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textTertiary} />
          <Text style={[styles.notLoggedTitle, { color: colors.text }]}>
            Not Signed In
          </Text>
          <Text style={[styles.notLoggedDesc, { color: colors.textSecondary }]}>
            Sign in to access your profile and personalized features
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            size="lg"
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const themeOptions: { label: string; value: 'light' | 'dark' | 'system'; icon: string }[] = [
    { label: 'Light', value: 'light', icon: 'sunny-outline' },
    { label: 'Dark', value: 'dark', icon: 'moon-outline' },
    { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  ];

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', action: 'edit-profile' },
        { icon: 'location-outline', label: 'Polling Station', action: 'polling-station' },
        { icon: 'shield-checkmark-outline', label: 'Verification', action: 'verification' },
      ],
    },
    {
      title: 'Activity',
      items: [
        { icon: 'heart-outline', label: 'Following', action: 'following' },
        { icon: 'stats-chart-outline', label: 'My Votes', action: 'my-votes' },
        { icon: 'wallet-outline', label: 'Wallet', action: 'wallet' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: 'notifications-outline', label: 'Notifications', action: 'notifications' },
        { icon: 'help-circle-outline', label: 'Help & Support', action: 'help' },
        { icon: 'document-text-outline', label: 'Terms & Privacy', action: 'terms' },
      ],
    },
  ];

  const securityItems = biometricAvailable
    ? [
        {
          icon: (biometricType.includes('Face') ? 'scan' : 'finger-print') as any,
          label: `${biometricType} Login`,
          action: 'biometric',
          hasToggle: true,
        },
      ]
    : [];

  const handleMenuPress = (action: string) => {
    switch (action) {
      case 'edit-profile':
        Alert.alert('Edit Profile', 'Profile editing coming soon!');
        break;
      case 'polling-station':
        Alert.alert('Polling Station', 'Update your polling station information.');
        break;
      case 'verification':
        Alert.alert('Verification', 'Verify your account details.');
        break;
      case 'following':
        router.push('/(tabs)/candidates');
        break;
      case 'my-votes':
        Alert.alert('My Votes', 'View your voting history.');
        break;
      case 'wallet':
        Alert.alert('Wallet', 'Wallet feature coming soon!');
        break;
      case 'notifications':
        router.push('/notifications');
        break;
      case 'help':
        Alert.alert('Help & Support', 'Contact support at support@keyvote.online');
        break;
      case 'terms':
        Alert.alert('Terms & Privacy', 'View our terms of service and privacy policy.');
        break;
      default:
        Alert.alert('Coming Soon', 'This feature is coming soon!');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Avatar
            uri={profile.profile_photo_url}
            name={profile.full_name || 'User'}
            size={72}
          />
          <Text style={[styles.userName, { color: colors.text }]}>
            {profile.full_name || 'User'}
          </Text>
          <Text style={[styles.userPhone, { color: colors.textSecondary }]}>
            {profile.phone}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={profile.role || 'voter'} variant="default" />
            {profile.is_verified && <Badge label="Verified" variant="success" />}
          </View>

          {/* Profile Details */}
          <View style={[styles.detailsGrid, { borderTopColor: colors.border }]}>
            {profile.gender && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Gender</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {GENDER_LABELS[profile.gender] || profile.gender}
                </Text>
              </View>
            )}
            {profile.age_bracket && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Age</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{profile.age_bracket}</Text>
              </View>
            )}
            {profile.id_number && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>ID</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {profile.id_number.replace(/(.{4})/g, '$1 ').trim()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Sections */}
        {/* Theme Switcher */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Appearance
          </Text>
          <View style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {themeOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setThemeMode(opt.value)}
                style={({ pressed }) => [
                  styles.themeOption,
                  themeMode === opt.value && { backgroundColor: colors.primaryFaded, borderColor: colors.primary },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={20}
                  color={themeMode === opt.value ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.themeLabel,
                  { color: themeMode === opt.value ? colors.primary : colors.textSecondary },
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Security Section (Biometric) */}
        {securityItems.length > 0 && (
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Security
            </Text>
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {securityItems.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.menuItem,
                    idx < securityItems.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                  <Text style={[styles.menuLabel, { color: colors.text, flex: 1 }]}>
                    {item.label}
                  </Text>
                  {item.hasToggle && (
                    <Switch
                      value={biometricEnabled}
                      onValueChange={handleToggleBiometric}
                      disabled={isBiometricLoading}
                      trackColor={{ false: colors.border, true: colors.primaryFaded }}
                      thumbColor={biometricEnabled ? colors.primary : colors.textTertiary}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {menuSections.map((section, si) => (
          <View key={si} style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, ii) => (
                <Pressable
                  key={ii}
                  onPress={() => handleMenuPress(item.action)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    ii < section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                  <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: colors.error },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </Pressable>

        {/* App Version */}
        <Text style={[styles.version, { color: colors.textTertiary }]}>
          myVote Kenya v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: '800' },
  profileCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  userPhone: {
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    width: '100%',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: { fontSize: FontSize.xs },
  detailValue: { fontSize: FontSize.sm, fontWeight: '600', marginTop: 2 },
  menuSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  menuCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: '500',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  signOutText: {
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  themeLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSize.xs,
  },
  notLoggedIn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'],
  },
  notLoggedTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  notLoggedDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
