import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { FontSize, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo / Hero */}
        <View style={styles.hero}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryFaded }]}>
            <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            myVote Kenya
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your Voice, Your Vote, Your Future
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: 'people-outline' as const, text: 'Follow your favourite candidates' },
            { icon: 'stats-chart-outline' as const, text: 'Participate in opinion polls' },
            { icon: 'bar-chart-outline' as const, text: 'View real-time election results' },
            { icon: 'notifications-outline' as const, text: 'Get election alerts & updates' },
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primaryFaded }]}>
                <Ionicons name={feature.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { value: '47', label: 'Counties' },
            { value: '290', label: 'Constituencies' },
            { value: '1,450', label: 'Wards' },
          ].map((stat, i) => (
            <View key={i} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(auth)/register')}
          fullWidth
          size="lg"
        />
        <Button
          title="I already have an account"
          onPress={() => router.push('/(auth)/login')}
          variant="outline"
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.md }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize['4xl'],
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  features: {
    marginBottom: Spacing['3xl'],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    fontSize: FontSize.base,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  buttons: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },
});
