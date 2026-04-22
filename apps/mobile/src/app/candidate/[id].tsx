/**
 * Mobile parity for the web /candidates/[id] page.
 *
 * Uses the shared `candidatesApi.byId / follow / unfollow` so the route
 * (`/api/candidates/:id`) and behavior are identical to the web profile
 * page.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Share,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, Button, Card, LoadingScreen } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { candidatesApi, ApiError } from '@/lib/api-client';
import type { CandidateDetail } from '@/lib/api-client';

const positionColors: Record<string, string> = {
  president: '#a855f7',
  governor: '#3b82f6',
  senator: '#10b981',
  women_rep: '#ec4899',
  mp: '#f97316',
  mca: '#14b8a6',
};

export default function CandidateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const queryClient = useQueryClient();

  const { data: candidate, isLoading, error, refetch } = useQuery<CandidateDetail>({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.byId(id!),
    enabled: !!id,
  });

  const follow = useMutation({
    mutationFn: () =>
      candidate?.isFollowing ? candidatesApi.unfollow(id!) : candidatesApi.follow(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidate', id] }),
    onError: (err: any) => {
      const message = err instanceof ApiError ? err.message : err?.message || 'Failed';
      Alert.alert('Error', message);
    },
  });

  const handleShare = async () => {
    if (!candidate) return;
    try {
      await Share.share({
        title: `${candidate.name} \u2014 ${candidate.positionLabel} Candidate`,
        message:
          candidate.slogan || `Check out ${candidate.name}'s profile on myVote Kenya`,
      });
    } catch {
      // user cancelled
    }
  };

  if (isLoading) return <LoadingScreen message="Loading candidate..." />;
  if (error || !candidate) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error, marginBottom: 12 }}>
          {(error as Error)?.message || 'Candidate not found'}
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  const positionColor = positionColors[candidate.position] || '#6b7280';
  const partyColor = candidate.party?.primaryColor || positionColor;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.hero, { backgroundColor: partyColor + '33' }]} />

      <View style={styles.heroBody}>
        <View style={[styles.avatarWrap, { borderColor: colors.background }]}>
          <Avatar uri={candidate.photoUrl} name={candidate.name} size={96} />
        </View>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <Badge label={candidate.positionLabel} variant="default" />
              {candidate.isVerified && <Badge label="Verified" variant="success" />}
              {candidate.isIndependent && <Badge label="Independent" variant="warning" />}
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {candidate.name}
            </Text>
            {!!candidate.party && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {!!candidate.party.symbolUrl && (
                  <Image
                    source={{ uri: candidate.party.symbolUrl }}
                    style={{ width: 18, height: 18, borderRadius: 4 }}
                  />
                )}
                <Text style={{ color: colors.textSecondary }}>
                  {candidate.party.name} ({candidate.party.abbreviation})
                </Text>
              </View>
            )}
            {!!candidate.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>
                  {candidate.location}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Button
            title={candidate.isFollowing ? 'Following' : 'Follow'}
            onPress={() => follow.mutate()}
            disabled={follow.isPending}
            variant={candidate.isFollowing ? 'outline' : 'primary'}
            style={{ flex: 1 }}
          />
          <Pressable
            onPress={handleShare}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <Stat label="Followers" value={candidate.followerCount.toLocaleString()} colors={colors} />
          <Stat
            label="Joined"
            value={new Date(candidate.joinedAt).toLocaleDateString('en-KE', {
              month: 'short',
              year: 'numeric',
            })}
            colors={colors}
          />
          <Stat
            label="Demographics"
            value={candidate.demographics.total.toLocaleString()}
            colors={colors}
          />
        </View>

        {!!candidate.slogan && (
          <Card style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
            <Text style={{ fontStyle: 'italic', color: colors.text, fontSize: FontSize.base }}>
              {`\u201C${candidate.slogan}\u201D`}
            </Text>
          </Card>
        )}

        {!!candidate.bio && (
          <Section title="About" colors={colors}>
            <Text style={{ color: colors.text, lineHeight: 20 }}>{candidate.bio}</Text>
          </Section>
        )}

        {!!candidate.manifesto && (
          <Section title="Manifesto" colors={colors}>
            <Text style={{ color: colors.text, lineHeight: 20 }}>{candidate.manifesto}</Text>
            {!!candidate.manifestoPdfUrl && (
              <Pressable
                onPress={() => Linking.openURL(candidate.manifestoPdfUrl!)}
                style={[styles.linkRow, { borderColor: colors.border }]}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  Download manifesto PDF
                </Text>
              </Pressable>
            )}
            {!!candidate.videoUrl && (
              <Pressable
                onPress={() => Linking.openURL(candidate.videoUrl!)}
                style={[styles.linkRow, { borderColor: colors.border }]}
              >
                <Ionicons name="play-circle-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  Watch campaign video
                </Text>
              </Pressable>
            )}
          </Section>
        )}

        {!!candidate.demographics?.total && (
          <Section title="Follower Demographics" colors={colors}>
            <DemoBlock
              title="By Gender"
              data={candidate.demographics.byGender}
              total={candidate.demographics.total}
              colors={colors}
            />
            <View style={{ height: 12 }} />
            <DemoBlock
              title="By Age"
              data={candidate.demographics.byAge}
              total={candidate.demographics.total}
              colors={colors}
            />
          </Section>
        )}

        {hasSocial(candidate.socialLinks) && (
          <Section title="Connect" colors={colors}>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              {candidate.socialLinks.facebook && (
                <SocialIcon url={candidate.socialLinks.facebook} icon="logo-facebook" colors={colors} />
              )}
              {candidate.socialLinks.twitter && (
                <SocialIcon url={candidate.socialLinks.twitter} icon="logo-twitter" colors={colors} />
              )}
              {candidate.socialLinks.instagram && (
                <SocialIcon url={candidate.socialLinks.instagram} icon="logo-instagram" colors={colors} />
              )}
              {candidate.socialLinks.tiktok && (
                <SocialIcon url={candidate.socialLinks.tiktok} icon="logo-tiktok" colors={colors} />
              )}
            </View>
          </Section>
        )}

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}

function hasSocial(links: CandidateDetail['socialLinks']) {
  return !!(links.facebook || links.twitter || links.instagram || links.tiktok);
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <Card style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: Spacing.sm, fontSize: FontSize.base }}>
        {title}
      </Text>
      {children}
    </Card>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>
        {value}
      </Text>
      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function DemoBlock({
  title,
  data,
  total,
  colors,
}: {
  title: string;
  data: Record<string, number>;
  total: number;
  colors: any;
}) {
  const entries = useMemo(
    () => Object.entries(data || {}).sort((a, b) => b[1] - a[1]),
    [data],
  );
  if (!entries.length) return null;
  return (
    <View>
      <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginBottom: 4 }}>
        {title}
      </Text>
      {entries.map(([key, count]) => {
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <View key={key} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {count} ({pct}%)
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.borderLight, borderRadius: 3, marginTop: 2 }}>
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: colors.primary,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SocialIcon({
  url,
  icon,
  colors,
}: {
  url: string;
  icon: any;
  colors: any;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={[styles.socialBtn, { borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  hero: { height: 140 },
  heroBody: { paddingHorizontal: Spacing.lg, marginTop: -56 },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  headerRow: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.md },
  name: { fontSize: FontSize['2xl'], fontWeight: '800' },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
