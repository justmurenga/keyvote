import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, Badge, LoadingScreen, EmptyState } from '@/components/ui';
import { fetchCandidates, type Candidate } from '@/services/api';
import { ELECTORAL_POSITIONS, POSITION_LABELS } from '@/constants';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function CandidatesScreen() {
  const router = useRouter();
  const colors = useTheme();
  const [position, setPosition] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['candidates', position, search, page],
    queryFn: () => fetchCandidates({ position, search, page, limit: 20 }),
  });

  const candidates = data?.candidates || [];
  const total = data?.total || 0;

  const renderCandidate = useCallback(({ item }: { item: any }) => {
    const candidate = item as Candidate;
    return (
      <TouchableOpacity
        style={[styles.candidateCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/candidate/${candidate.id}`)}
        activeOpacity={0.7}
      >
        <Avatar
          uri={candidate.user?.profile_photo_url}
          name={candidate.user?.full_name}
          size={56}
        />
        <View style={styles.candidateInfo}>
          <Text style={[styles.candidateName, { color: colors.text }]} numberOfLines={1}>
            {candidate.user?.full_name}
          </Text>
          <View style={styles.candidateMetaRow}>
            <Badge
              label={POSITION_LABELS[candidate.position as keyof typeof POSITION_LABELS] || candidate.position}
              variant="default"
            />
            {candidate.party && (
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>
                {candidate.party.abbreviation || candidate.party.name}
              </Text>
            )}
            {candidate.is_independent && (
              <Text style={[styles.partyName, { color: colors.textSecondary }]}>Independent</Text>
            )}
          </View>
          {candidate.campaign_slogan && (
            <Text style={[styles.slogan, { color: colors.textTertiary }]} numberOfLines={1}>
              "{candidate.campaign_slogan}"
            </Text>
          )}
        </View>
        <View style={styles.followCount}>
          <Text style={[styles.followValue, { color: colors.primary }]}>
            {candidate.follower_count || 0}
          </Text>
          <Text style={[styles.followLabel, { color: colors.textTertiary }]}>followers</Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Candidates</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {total} candidates found
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search candidates..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
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
            onPress={() => {
              setPosition(item.key);
              setPage(1);
            }}
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

      {/* Candidates List */}
      {isLoading ? (
        <LoadingScreen message="Loading candidates..." />
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item: any) => item.id}
          renderItem={renderCandidate}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="people-outline" size={48} color={colors.textTertiary} />}
              title="No candidates found"
              description="Try adjusting your search or filters"
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    paddingVertical: 4,
  },
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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  candidateInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  candidateName: {
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  candidateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  partyName: {
    fontSize: FontSize.xs,
  },
  slogan: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  followCount: {
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  followValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  followLabel: {
    fontSize: 10,
  },
});
