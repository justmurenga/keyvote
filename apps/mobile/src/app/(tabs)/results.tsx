import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Badge, LoadingScreen, EmptyState, Avatar } from '@/components/ui';
import { fetchResults, type ElectionResult, type ResultCandidate } from '@/services/api';
import { ELECTORAL_POSITIONS, POSITION_LABELS } from '@/constants';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function ResultsScreen() {
  const colors = useTheme();
  const [position, setPosition] = useState<string>('president');
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadResults = useCallback(async () => {
    try {
      const data = await fetchResults({ position });
      setResults(data);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      // Demo data fallback
      setResults([
        {
          position: 'president',
          region_name: 'National',
          region_type: 'national',
          status: 'live',
          total_votes: 14250300,
          stations_reported: 38500,
          total_stations: 46229,
          candidates: [
            { id: '1', name: 'Demo Candidate A', party: 'Party A', party_color: '#16a34a', votes: 7100000, percentage: 49.8, photo_url: null },
            { id: '2', name: 'Demo Candidate B', party: 'Party B', party_color: '#0ea5e9', votes: 5700000, percentage: 40.0, photo_url: null },
            { id: '3', name: 'Demo Candidate C', party: 'Independent', party_color: '#f59e0b', votes: 1450300, percentage: 10.2, photo_url: null },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [position]);

  useEffect(() => {
    setIsLoading(true);
    loadResults();
  }, [position]);

  // Auto-refresh every 30 seconds for live results
  useEffect(() => {
    const interval = setInterval(loadResults, 30000);
    return () => clearInterval(interval);
  }, [loadResults]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadResults();
  };

  const formatNumber = (num: number | undefined | null) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const renderResult = useCallback(({ item }: { item: ElectionResult }) => {
    const reportingPct = item.total_stations > 0
      ? ((item.stations_reported / item.total_stations) * 100).toFixed(1)
      : '0.0';

    return (
      <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.resultHeader}>
          <View>
            <Text style={[styles.regionName, { color: colors.text }]}>{item.region_name}</Text>
            <Text style={[styles.regionType, { color: colors.textSecondary }]}>
              {item.region_type} • {item.stations_reported}/{item.total_stations} stations
            </Text>
          </View>
          <View style={styles.statusContainer}>
            {item.status === 'live' && (
              <View style={styles.liveIndicator}>
                <View style={[styles.liveDot, { backgroundColor: colors.error }]} />
                <Text style={[styles.liveText, { color: colors.error }]}>LIVE</Text>
              </View>
            )}
            <Badge
              label={`${reportingPct}% reported`}
              variant={Number(reportingPct) > 80 ? 'success' : 'warning'}
            />
          </View>
        </View>

        {/* Total Votes */}
        <Text style={[styles.totalVotes, { color: colors.textSecondary }]}>
          Total votes: {formatNumber(item.total_votes)}
        </Text>

        {/* Candidates */}
        <View style={styles.candidatesList}>
          {item.candidates.map((candidate, index) => (
            <View key={candidate.id} style={styles.candidateRow}>
              <View style={styles.rankContainer}>
                <Text style={[
                  styles.rank,
                  { color: index === 0 ? colors.primary : colors.textSecondary }
                ]}>
                  #{index + 1}
                </Text>
              </View>
              <Avatar uri={candidate.photo_url} name={candidate.name} size={40} />
              <View style={styles.candidateDetails}>
                <Text style={[styles.candidateName, { color: colors.text }]} numberOfLines={1}>
                  {candidate.name}
                </Text>
                <Text style={[styles.candidateParty, { color: colors.textTertiary }]}>
                  {candidate.party}
                </Text>
                {/* Progress Bar */}
                <View style={[styles.progressBg, { backgroundColor: colors.borderLight }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${candidate.percentage}%`,
                        backgroundColor: candidate.party_color || colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.voteInfo}>
                <Text style={[styles.votePercentage, { color: colors.text }]}>
                  {candidate.percentage.toFixed(1)}%
                </Text>
                <Text style={[styles.voteCount, { color: colors.textTertiary }]}>
                  {formatNumber(candidate.votes)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }, [colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Election Results</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Real-time results from polling stations
        </Text>
      </View>

      {/* Position Filter */}
      <FlatList
        horizontal
        data={ELECTORAL_POSITIONS.map((p) => ({ key: p, label: POSITION_LABELS[p] }))}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setPosition(item.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: position === item.key ? colors.primary : colors.surface,
                borderColor: position === item.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: position === item.key ? colors.white : colors.textSecondary,
                fontSize: FontSize.sm,
                fontWeight: position === item.key ? '600' : '400',
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.infoLight }]}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={[styles.disclaimerText, { color: colors.info }]}>
          These are provisional tallies and may change. Auto-refreshes every 30s.
        </Text>
      </View>

      {/* Results */}
      {isLoading ? (
        <LoadingScreen message="Loading results..." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderResult}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />}
              title="No results available"
              description="Results will appear here during election periods"
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
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  disclaimerText: { fontSize: FontSize.xs, flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  resultCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  regionName: { fontSize: FontSize.lg, fontWeight: '700' },
  regionType: { fontSize: FontSize.xs, marginTop: 2 },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  totalVotes: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  candidatesList: {
    gap: 12,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
  },
  rank: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  candidateDetails: {
    flex: 1,
  },
  candidateName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  candidateParty: {
    fontSize: FontSize.xs,
    marginBottom: 4,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  voteInfo: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  votePercentage: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  voteCount: {
    fontSize: 10,
  },
});
