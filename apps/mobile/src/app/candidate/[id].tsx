import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, Button, Card, LoadingScreen } from '@/components/ui';
import {
  fetchCandidateById,
  isFollowingCandidate,
  followCandidate,
  unfollowCandidate,
} from '@/services/api';
import { POSITION_LABELS } from '@/constants';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function CandidateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const queryClient = useQueryClient();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => fetchCandidateById(id!),
    enabled: !!id,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ['isFollowing', id],
    queryFn: () => isFollowingCandidate(id!),
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: () => (isFollowing ? unfollowCandidate(id!) : followCandidate(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', id] });
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
    onError: (error: Error) => Alert.alert('Error', error.message),
  });

  if (isLoading) return <LoadingScreen message="Loading candidate..." />;
  if (!candidate) return <LoadingScreen message="Candidate not found" />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.primaryFaded }]}>
        <Avatar
          uri={candidate.user?.profile_photo_url}
          name={candidate.user?.full_name}
          size={100}
        />
        <Text style={[styles.name, { color: colors.text }]}>
          {candidate.user?.full_name}
        </Text>
        <View style={styles.badges}>
          <Badge
            label={POSITION_LABELS[candidate.position as keyof typeof POSITION_LABELS] || candidate.position}
          />
          {candidate.party ? (
            <Badge label={candidate.party.abbreviation || candidate.party.name} variant="info" />
          ) : candidate.is_independent ? (
            <Badge label="Independent" variant="warning" />
          ) : null}
          {candidate.is_verified && <Badge label="Verified" variant="success" />}
        </View>
        {candidate.campaign_slogan && (
          <Text style={[styles.slogan, { color: colors.textSecondary }]}>
            "{candidate.campaign_slogan}"
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title={isFollowing ? 'Unfollow' : 'Follow'}
          onPress={() => followMutation.mutate()}
          variant={isFollowing ? 'outline' : 'primary'}
          loading={followMutation.isPending}
          icon={
            <Ionicons
              name={isFollowing ? 'heart' : 'heart-outline'}
              size={18}
              color={isFollowing ? colors.primary : colors.white}
            />
          }
          style={{ flex: 1 }}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {candidate.follower_count || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name={candidate.is_verified ? 'shield-checkmark' : 'shield-outline'} size={24} color={candidate.is_verified ? colors.success : colors.textTertiary} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {candidate.verification_status || 'Pending'}
          </Text>
        </View>
      </View>

      {/* Manifesto */}
      {candidate.manifesto_text && (
        <Card title="Manifesto" style={styles.section}>
          <Text style={[styles.manifestoText, { color: colors.text }]}>
            {candidate.manifesto_text}
          </Text>
        </Card>
      )}

      {/* Social Links */}
      <Card title="Connect" style={styles.section}>
        <View style={styles.socialLinks}>
          {candidate.facebook_url && (
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1877F2' }]}>
              <Ionicons name="logo-facebook" size={20} color="white" />
            </TouchableOpacity>
          )}
          {candidate.twitter_url && (
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1DA1F2' }]}>
              <Ionicons name="logo-twitter" size={20} color="white" />
            </TouchableOpacity>
          )}
          {candidate.instagram_url && (
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#E1306C' }]}>
              <Ionicons name="logo-instagram" size={20} color="white" />
            </TouchableOpacity>
          )}
          {candidate.tiktok_url && (
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#000000' }]}>
              <Ionicons name="logo-tiktok" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
        {!candidate.facebook_url && !candidate.twitter_url && !candidate.instagram_url && !candidate.tiktok_url && (
          <Text style={[styles.noSocial, { color: colors.textTertiary }]}>
            No social links available
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: Spacing['5xl'] },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
  },
  name: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  slogan: {
    fontSize: FontSize.base,
    fontStyle: 'italic',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 12,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  statValue: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  manifestoText: {
    fontSize: FontSize.base,
    lineHeight: 24,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSocial: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
