import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import { Badge, Button, Card, EmptyState, LoadingScreen } from '@/components/ui';
import {
  fetchCandidatePortalSummary,
  fetchFieldAssignments,
  fetchMyResultSubmissions,
  type CandidatePortalSummary,
  type PollingStationAssignment,
  type ElectionDaySubmission,
} from '@/services/api';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const FALLBACK_SUMMARY: CandidatePortalSummary = {
  pendingAssignments: 8,
  submittedResults: 3,
  approvedResults: 1,
  flaggedResults: 0,
};

const FALLBACK_ASSIGNMENTS: PollingStationAssignment[] = [
  {
    id: 'a-001',
    polling_station_id: 'ps-001',
    polling_station_name: 'Kasarani Primary School',
    polling_station_code: 'KAS-01',
    ward_name: 'Mwiki',
    constituency_name: 'Kasarani',
    county_name: 'Nairobi',
    due_at: new Date().toISOString(),
    status: 'pending',
  },
  {
    id: 'a-002',
    polling_station_id: 'ps-002',
    polling_station_name: 'Mwiki Secondary School',
    polling_station_code: 'KAS-02',
    ward_name: 'Mwiki',
    constituency_name: 'Kasarani',
    county_name: 'Nairobi',
    due_at: new Date().toISOString(),
    status: 'in_progress',
  },
];

const FALLBACK_SUBMISSIONS: ElectionDaySubmission[] = [
  {
    id: 's-001',
    assignment_id: 'a-100',
    polling_station_code: 'KAS-04',
    position: 'governor',
    official_form_reference: '34B-001',
    evidence_url: 'https://example.com/form-34b-001.jpg',
    announced_at: new Date().toISOString(),
    status: 'submitted',
    created_at: new Date().toISOString(),
  },
];

export default function FieldOpsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const role = useAuthStore((s: any) => s.profile?.role || 'voter');
  const hasAccess = ['candidate', 'agent', 'admin', 'super_admin'].includes(role);

  const summaryQuery = useQuery({
    queryKey: ['candidate-portal-summary'],
    queryFn: fetchCandidatePortalSummary,
    enabled: hasAccess,
  });

  const assignmentQuery = useQuery({
    queryKey: ['field-assignments'],
    queryFn: fetchFieldAssignments,
    enabled: hasAccess,
  });

  const submissionsQuery = useQuery({
    queryKey: ['field-submissions'],
    queryFn: fetchMyResultSubmissions,
    enabled: hasAccess,
  });

  const summary = summaryQuery.data || FALLBACK_SUMMARY;
  const assignments = assignmentQuery.data?.length ? assignmentQuery.data : FALLBACK_ASSIGNMENTS;
  const submissions = submissionsQuery.data?.length ? submissionsQuery.data : FALLBACK_SUBMISSIONS;

  const isLoading = hasAccess && summaryQuery.isLoading && assignmentQuery.isLoading;

  const onRefresh = async () => {
    await Promise.all([
      summaryQuery.refetch(),
      assignmentQuery.refetch(),
      submissionsQuery.refetch(),
    ]);
  };

  const statusVariant = (status: PollingStationAssignment['status']) => {
    if (status === 'approved') return 'success';
    if (status === 'submitted') return 'default';
    if (status === 'rejected') return 'error';
    if (status === 'in_progress') return 'warning';
    return 'warning';
  };

  const recent = useMemo(() => submissions.slice(0, 4), [submissions]);

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={48} color={colors.textTertiary} />}
          title="Field operations restricted"
          description="Only candidate and agent accounts can capture and submit announced polling-station results."
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading field operations..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={assignments}
        keyExtractor={(item: PollingStationAssignment) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={assignmentQuery.isRefetching || submissionsQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={[styles.title, { color: colors.text }]}>Candidate & Agent Field Ops</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Capture announced station results and upload official evidence.</Text>

            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.text }]}>{summary.pendingAssignments}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.text }]}>{summary.submittedResults}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Submitted</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.text }]}>{summary.approvedResults}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.text }]}>{summary.flaggedResults}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Flagged</Text>
              </Card>
            </View>

            <Button
              title="Submit Announced Results"
              onPress={() => router.push('/result-submission/new')}
              icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.white} />}
              fullWidth
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigned Polling Stations</Text>
          </View>
        }
        renderItem={({ item }: { item: PollingStationAssignment }) => (
          <View style={[styles.assignmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.assignmentHeader}>
              <Text style={[styles.stationName, { color: colors.text }]}>{item.polling_station_name}</Text>
              <Badge label={item.status.replace('_', ' ')} variant={statusVariant(item.status)} />
            </View>

            <Text style={[styles.stationMeta, { color: colors.textSecondary }]}>Code: {item.polling_station_code}</Text>
            <Text style={[styles.stationMeta, { color: colors.textSecondary }]}>
              {item.ward_name || 'Ward'} • {item.constituency_name || 'Constituency'} • {item.county_name || 'County'}
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/result-submission/new',
                  params: {
                    assignmentId: item.id,
                    pollingStationCode: item.polling_station_code,
                    pollingStationName: item.polling_station_name,
                  },
                })
              }
              style={[styles.captureButton, { borderColor: colors.primary }]}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.captureText, { color: colors.primary }]}>Capture Result</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footerBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Submissions</Text>
            {recent.map((item: ElectionDaySubmission) => (
              <View
                key={item.id}
                style={[styles.recentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recentCode, { color: colors.text }]}>{item.polling_station_code}</Text>
                  <Text style={[styles.recentMeta, { color: colors.textSecondary }]}>
                    {item.position.toUpperCase()} • {new Date(item.created_at).toLocaleString()}
                  </Text>

                  {item.timeline?.length ? (
                    <View style={styles.timelineBlock}>
                      {item.timeline.map((event: NonNullable<ElectionDaySubmission['timeline']>[number], index: number) => (
                        <View key={`${item.id}-${index}`} style={styles.timelineRow}>
                          <Ionicons
                            name={event.status === 'approved' ? 'checkmark-circle' : event.status === 'rejected' ? 'close-circle' : 'ellipse'}
                            size={13}
                            color={event.status === 'approved' ? colors.success : event.status === 'rejected' ? colors.error : colors.textTertiary}
                          />
                          <Text style={[styles.timelineText, { color: colors.textSecondary }]}>
                            {event.status} • {new Date(event.at).toLocaleString()}
                            {event.comment ? ` • ${event.comment}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
                <Badge
                  label={item.status}
                  variant={
                    item.status === 'approved'
                      ? 'success'
                      : item.status === 'rejected'
                        ? 'error'
                        : 'default'
                  }
                />
              </View>
            ))}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: '800' },
  subtitle: { fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.lg },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '47%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingBottom: 100,
  },
  assignmentCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stationName: {
    fontSize: FontSize.base,
    fontWeight: '700',
    flex: 1,
  },
  stationMeta: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  captureButton: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  captureText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  footerBlock: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  recentRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  recentCode: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  recentMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  timelineBlock: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineText: {
    fontSize: 11,
    flex: 1,
  },
});
