import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { Badge, LoadingScreen, EmptyState, Avatar } from '@/components/ui';
import { fetchPolls, votePoll, type Poll, type PollOption } from '@/services/api';
import { ELECTORAL_POSITIONS, POSITION_LABELS } from '@/constants';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function PollsScreen() {
  const colors = useTheme();
  const queryClient = useQueryClient();
  const [position, setPosition] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data: polls, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['polls', position, statusFilter],
    queryFn: () => fetchPolls({ position, status: statusFilter }),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      votePoll(pollId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      Alert.alert('Success', 'Your vote has been recorded!');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleVote = (pollId: string, optionId: string) => {
    Alert.alert('Confirm Vote', 'Are you sure? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Vote', onPress: () => voteMutation.mutate({ pollId, optionId }) },
    ]);
  };

  const renderPoll = useCallback(({ item }: { item: Poll }) => {
    const totalVotes = item.options?.reduce((sum: number, opt: PollOption) => sum + (opt.vote_count || 0), 0) || 0;
    const isActive = item.status === 'active';

    return (
      <View style={[styles.pollCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Poll Header */}
        <View style={styles.pollHeader}>
          <View style={styles.pollHeaderLeft}>
            <Badge
              label={POSITION_LABELS[item.position as keyof typeof POSITION_LABELS] || item.position}
            />
            <Badge
              label={item.status}
              variant={isActive ? 'success' : 'default'}
            />
          </View>
          <Text style={[styles.voteCount, { color: colors.textSecondary }]}>
            {totalVotes} votes
          </Text>
        </View>

        <Text style={[styles.pollTitle, { color: colors.text }]}>{item.title}</Text>
        {item.description && (
          <Text style={[styles.pollDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Options */}
        <View style={styles.options}>
          {item.options?.map((option: PollOption) => {
            const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => isActive ? handleVote(item.id, option.id) : undefined}
                disabled={!isActive || voteMutation.isPending}
                activeOpacity={isActive ? 0.7 : 1}
                style={[styles.optionRow, { borderColor: colors.border }]}
              >
                <View style={styles.optionInfo}>
                  {option.candidate?.user && (
                    <Avatar
                      uri={option.candidate.user.profile_photo_url}
                      name={option.candidate.user.full_name}
                      size={32}
                    />
                  )}
                  <View style={styles.optionText}>
                    <Text style={[styles.optionName, { color: colors.text }]}>
                      {option.option_text || option.candidate?.user?.full_name || 'Option'}
                    </Text>
                    {option.candidate?.party && (
                      <Text style={[styles.optionParty, { color: colors.textTertiary }]}>
                        {option.candidate.party.abbreviation}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Result bar */}
                <View style={styles.resultBar}>
                  <View
                    style={[
                      styles.resultFill,
                      {
                        width: `${Math.max(percentage, 2)}%`,
                        backgroundColor: option.candidate?.party?.color || colors.primary,
                        opacity: 0.2,
                      },
                    ]}
                  />
                  <Text style={[styles.percentage, { color: colors.text }]}>
                    {percentage.toFixed(1)}%
                  </Text>
                  <Text style={[styles.optionVotes, { color: colors.textTertiary }]}>
                    {option.vote_count || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Poll Footer */}
        <View style={styles.pollFooter}>
          {item.end_date && (
            <Text style={[styles.endDate, { color: colors.textTertiary }]}>
              <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
              {' '}Ends: {new Date(item.end_date).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  }, [colors, voteMutation, handleVote]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Opinion Polls</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Voice your opinion
        </Text>
      </View>

      {/* Status Filter */}
      <View style={styles.statusRow}>
        {['active', 'completed', 'all'].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[
              styles.statusChip,
              {
                backgroundColor: statusFilter === s ? colors.primary : colors.surface,
                borderColor: statusFilter === s ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: statusFilter === s ? colors.white : colors.textSecondary,
                fontSize: FontSize.sm,
                fontWeight: statusFilter === s ? '600' : '400',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Position Filter */}
      <FlatList
        horizontal
        data={[{ key: 'all', label: 'All' }, ...ELECTORAL_POSITIONS.map((p) => ({ key: p, label: POSITION_LABELS[p] }))]}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setPosition(item.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: position === item.key ? colors.primaryFaded : colors.surface,
                borderColor: position === item.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: position === item.key ? colors.primary : colors.textSecondary,
                fontSize: FontSize.xs,
                fontWeight: position === item.key ? '600' : '400',
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Polls List */}
      {isLoading ? (
        <LoadingScreen message="Loading polls..." />
      ) : (
        <FlatList
          data={polls || []}
          keyExtractor={(item: Poll) => item.id}
          renderItem={renderPoll}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="stats-chart-outline" size={48} color={colors.textTertiary} />}
              title="No polls available"
              description="Check back later for new opinion polls"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  pollCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pollHeaderLeft: {
    flexDirection: 'row',
    gap: 6,
  },
  voteCount: { fontSize: FontSize.xs },
  pollTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  pollDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  options: {
    gap: 8,
  },
  optionRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  optionText: { flex: 1 },
  optionName: { fontSize: FontSize.sm, fontWeight: '600' },
  optionParty: { fontSize: FontSize.xs },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  resultFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
  },
  percentage: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginLeft: 4,
    zIndex: 1,
  },
  optionVotes: {
    fontSize: FontSize.xs,
    marginLeft: 'auto',
    zIndex: 1,
  },
  pollFooter: {
    marginTop: Spacing.md,
  },
  endDate: { fontSize: FontSize.xs },
});
