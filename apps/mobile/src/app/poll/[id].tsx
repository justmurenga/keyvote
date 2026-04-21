import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, Button, LoadingScreen } from '@/components/ui';
import { fetchPollById, votePoll, type Poll, type PollOption } from '@/services/api';
import { POSITION_LABELS } from '@/constants';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function PollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: poll, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn: () => fetchPollById(id!),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      votePoll(pollId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poll', id] });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      Alert.alert('Success', 'Your vote has been recorded!');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleVote = (optionId: string) => {
    if (!poll) return;
    Alert.alert('Confirm Vote', 'Are you sure? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Vote', onPress: () => voteMutation.mutate({ pollId: poll.id, optionId }) },
    ]);
  };

  if (isLoading) return <LoadingScreen message="Loading poll..." />;
  if (!poll) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="stats-chart-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.text }]}>Poll not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const totalVotes = poll.options?.reduce((sum, opt) => sum + (opt.vote_count || 0), 0) || 0;
  const isActive = poll.status === 'active';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Poll Meta */}
      <View style={styles.meta}>
        <View style={styles.badges}>
          <Badge
            label={POSITION_LABELS[poll.position as keyof typeof POSITION_LABELS] || poll.position}
          />
          <Badge
            label={poll.status}
            variant={isActive ? 'success' : 'default'}
          />
        </View>
        <Text style={[styles.voteCount, { color: colors.textSecondary }]}>
          {totalVotes} total votes
        </Text>
      </View>

      {/* Title & Description */}
      <Text style={[styles.title, { color: colors.text }]}>{poll.title}</Text>
      {poll.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {poll.description}
        </Text>
      )}

      {/* Dates */}
      {(poll.start_date || poll.end_date) && (
        <View style={[styles.datesRow, { borderColor: colors.border }]}>
          {poll.start_date && (
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>Started</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {new Date(poll.start_date).toLocaleDateString()}
              </Text>
            </View>
          )}
          {poll.end_date && (
            <View style={styles.dateItem}>
              <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>Ends</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {new Date(poll.end_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Options */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {isActive ? 'Cast Your Vote' : 'Results'}
      </Text>

      <View style={styles.options}>
        {poll.options?.map((option: PollOption) => {
          const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
          const isUserVote = poll.user_vote === option.id;
          const barColor = option.candidate?.party?.color || colors.primary;

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => isActive ? handleVote(option.id) : undefined}
              disabled={!isActive || voteMutation.isPending}
              activeOpacity={isActive ? 0.7 : 1}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isUserVote ? colors.primary : colors.border,
                  borderWidth: isUserVote ? 2 : 1,
                },
              ]}
            >
              {/* Candidate info */}
              <View style={styles.optionHeader}>
                {option.candidate?.user && (
                  <Avatar
                    uri={option.candidate.user.profile_photo_url}
                    name={option.candidate.user.full_name}
                    size={40}
                  />
                )}
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionName, { color: colors.text }]}>
                    {option.option_text || option.candidate?.user?.full_name || 'Option'}
                  </Text>
                  {option.candidate?.party && (
                    <Text style={[styles.optionParty, { color: colors.textTertiary }]}>
                      {option.candidate.party.abbreviation}
                    </Text>
                  )}
                </View>
                {isUserVote && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </View>

              {/* Progress bar */}
              <View style={[styles.barTrack, { backgroundColor: colors.surface }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(percentage, 1)}%` as any,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>

              <View style={styles.optionStats}>
                <Text style={[styles.percentage, { color: colors.text }]}>
                  {percentage.toFixed(1)}%
                </Text>
                <Text style={[styles.optionVotes, { color: colors.textTertiary }]}>
                  {option.vote_count || 0} votes
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isActive && (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          Tap an option to cast your vote
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  content: { padding: Spacing.lg, paddingBottom: Spacing['5xl'] },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badges: { flexDirection: 'row', gap: 6 },
  voteCount: { fontSize: FontSize.xs },
  title: { fontSize: FontSize['2xl'], fontWeight: '800', marginBottom: Spacing.sm },
  description: { fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.md },
  datesRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateLabel: { fontSize: FontSize.xs },
  dateValue: { fontSize: FontSize.xs, fontWeight: '600' },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  options: { gap: Spacing.md },
  optionCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  optionInfo: { flex: 1 },
  optionName: { fontSize: FontSize.md, fontWeight: '600' },
  optionParty: { fontSize: FontSize.xs, marginTop: 2 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    opacity: 0.8,
  },
  optionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  percentage: { fontSize: FontSize.xs, fontWeight: '700' },
  optionVotes: { fontSize: FontSize.xs },
  errorText: { fontSize: FontSize.lg, fontWeight: '600' },
  hint: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    marginTop: Spacing.lg,
  },
});
