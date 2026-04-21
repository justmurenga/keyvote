import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { Button, Input, Card } from '@/components/ui';
import { ELECTORAL_POSITIONS, POSITION_LABELS } from '@/constants';
import { submitPollingStationResult } from '@/services/api';
import {
  captureEvidenceWithCamera,
  pickEvidenceFromGallery,
  uploadResultEvidence,
  type PickedEvidence,
} from '@/services/upload-service';
import {
  enqueueSubmission,
  getQueuedSubmissions,
  retryQueuedSubmissions,
} from '@/services/offline-submission-queue';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

type TallyDraft = {
  candidateId: string;
  candidateName: string;
  votes: string;
};

export default function NewResultSubmissionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ assignmentId?: string; pollingStationCode?: string; pollingStationName?: string }>();
  const colors = useTheme();

  const [assignmentId] = useState(params.assignmentId || '');
  const [pollingStationCode, setPollingStationCode] = useState(params.pollingStationCode || '');
  const [pollingStationName] = useState(params.pollingStationName || '');
  const [position, setPosition] = useState<string>('president');
  const [officialFormReference, setOfficialFormReference] = useState('');
  const [announcedAt, setAnnouncedAt] = useState(new Date().toISOString().slice(0, 16));
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<PickedEvidence | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [tallies, setTallies] = useState<TallyDraft[]>([
    { candidateId: '', candidateName: '', votes: '' },
  ]);

  const submitMutation = useMutation({
    mutationFn: submitPollingStationResult,
    onSuccess: () => {
      Alert.alert('Submitted', 'Announced polling station results submitted successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Submission failed', error.message);
    },
  });

  React.useEffect(() => {
    (async () => {
      const queued = await getQueuedSubmissions();
      setQueuedCount(queued.length);
    })();
  }, []);

  const canSubmit = useMemo(() => {
    const hasTallies = tallies.some((row) => row.candidateName.trim() && Number(row.votes) >= 0);
    return (
      declaration &&
      pollingStationCode.trim().length > 0 &&
      officialFormReference.trim().length > 0 &&
      (evidenceUrl.trim().length > 0 || !!selectedEvidence?.uri) &&
      hasTallies
    );
  }, [declaration, pollingStationCode, officialFormReference, evidenceUrl, selectedEvidence, tallies]);

  const updateTally = (index: number, key: keyof TallyDraft, value: string) => {
    setTallies((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addTallyRow = () => {
    setTallies((current) => [...current, { candidateId: '', candidateName: '', votes: '' }]);
  };

  const removeTallyRow = (index: number) => {
    if (tallies.length === 1) return;
    setTallies((current) => current.filter((_, i) => i !== index));
  };

  const pickFromGallery = async () => {
    try {
      const picked = await pickEvidenceFromGallery();
      if (!picked) return;
      setSelectedEvidence(picked);
      setEvidenceUrl('');
    } catch (error: any) {
      Alert.alert('Permission required', error?.message || 'Could not open gallery');
    }
  };

  const captureWithCamera = async () => {
    try {
      const picked = await captureEvidenceWithCamera();
      if (!picked) return;
      setSelectedEvidence(picked);
      setEvidenceUrl('');
    } catch (error: any) {
      Alert.alert('Permission required', error?.message || 'Could not open camera');
    }
  };

  const syncQueued = async () => {
    const result = await retryQueuedSubmissions();
    const queued = await getQueuedSubmissions();
    setQueuedCount(queued.length);

    if (result.skipped) {
      Alert.alert('Offline', 'No network connection detected.');
      return;
    }

    Alert.alert(
      'Queue sync complete',
      `Synced: ${result.synced}\nFailed: ${result.failed}\nRemaining queue: ${queued.length}`
    );
  };

  const ensureEvidenceUrl = async () => {
    if (evidenceUrl.trim()) {
      return evidenceUrl.trim();
    }

    if (!selectedEvidence) {
      throw new Error('Please capture or select an evidence image first.');
    }

    setUploadingEvidence(true);
    try {
      const uploaded = await uploadResultEvidence(selectedEvidence);
      setEvidenceUrl(uploaded);
      return uploaded;
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert('Incomplete form', 'Fill required fields, add at least one tally row, and confirm declaration.');
      return;
    }

    (async () => {
      try {
        const resolvedEvidenceUrl = await ensureEvidenceUrl();
        const payload = {
          assignment_id: assignmentId || undefined,
          polling_station_code: pollingStationCode.trim(),
          position,
          official_form_reference: officialFormReference.trim(),
          announced_at: new Date(announcedAt).toISOString(),
          evidence_url: resolvedEvidenceUrl,
          notes: notes.trim() || undefined,
          tallies: tallies
            .filter((row) => row.candidateName.trim() && row.votes !== '')
            .map((row) => ({
              candidate_id: row.candidateId.trim() || undefined,
              candidate_name: row.candidateName.trim(),
              votes: Number(row.votes),
            })),
        };

        submitMutation.mutate(payload);
      } catch (error: any) {
        const payloadForQueue = {
          assignment_id: assignmentId || undefined,
          polling_station_code: pollingStationCode.trim(),
          position,
          official_form_reference: officialFormReference.trim(),
          announced_at: new Date(announcedAt).toISOString(),
          evidence_url: selectedEvidence?.uri || evidenceUrl.trim(),
          notes: notes.trim() || undefined,
          tallies: tallies
            .filter((row) => row.candidateName.trim() && row.votes !== '')
            .map((row) => ({
              candidate_id: row.candidateId.trim() || undefined,
              candidate_name: row.candidateName.trim(),
              votes: Number(row.votes),
            })),
        };

        await enqueueSubmission(payloadForQueue, error?.message || 'Submission failed');
        const queued = await getQueuedSubmissions();
        setQueuedCount(queued.length);

        Alert.alert(
          'Saved offline',
          'Submission has been queued. Retry sync from this screen when network is available.'
        );
      }
    })();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: colors.text }]}>Capture Announced Results</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>Submit only publicly announced station totals with evidence.</Text>

        <Card style={styles.queueCard}>
          <View style={styles.queueRow}>
            <View style={styles.queueMeta}>
              <Text style={[styles.queueTitle, { color: colors.text }]}>Offline Queue</Text>
              <Text style={[styles.queueText, { color: colors.textSecondary }]}>
                {queuedCount} pending submission{queuedCount === 1 ? '' : 's'}
              </Text>
            </View>
            <Button title="Retry Sync" onPress={syncQueued} variant="outline" size="sm" />
          </View>
        </Card>

        <Card style={styles.metaCard}>
          {assignmentId ? (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Assignment: {assignmentId}</Text>
          ) : null}
          {pollingStationName ? (
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Station: {pollingStationName}</Text>
          ) : null}
        </Card>

        <Input
          label="Polling Station Code"
          value={pollingStationCode}
          onChangeText={setPollingStationCode}
          placeholder="e.g. KAS-01"
        />

        <Input
          label="Official Form Reference"
          value={officialFormReference}
          onChangeText={setOfficialFormReference}
          placeholder="e.g. 34A-001"
          hint="Use the announced form serial/reference number"
        />

        <Text style={[styles.label, { color: colors.text }]}>Position</Text>
        <View style={styles.chipsRow}>
          {ELECTORAL_POSITIONS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setPosition(item)}
              style={[
                styles.chip,
                {
                  borderColor: position === item ? colors.primary : colors.border,
                  backgroundColor: position === item ? colors.primaryFaded : colors.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: position === item ? colors.primary : colors.textSecondary,
                  fontSize: FontSize.xs,
                  fontWeight: '600',
                }}
              >
                {POSITION_LABELS[item]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Announced Time (YYYY-MM-DDTHH:mm)"
          value={announcedAt}
          onChangeText={setAnnouncedAt}
          placeholder="2026-08-12T19:30"
          hint="24-hour format"
        />

        <Text style={[styles.label, { color: colors.text }]}>Result Sheet Evidence</Text>
        <View style={styles.evidenceActions}>
          <Button
            title="Open Camera"
            onPress={captureWithCamera}
            variant="outline"
            icon={<Ionicons name="camera-outline" size={16} color={colors.primary} />}
            style={styles.evidenceButton}
          />
          <Button
            title="Pick from Gallery"
            onPress={pickFromGallery}
            variant="outline"
            icon={<Ionicons name="images-outline" size={16} color={colors.primary} />}
            style={styles.evidenceButton}
          />
        </View>

        {selectedEvidence?.uri ? (
          <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Image source={{ uri: selectedEvidence.uri }} style={styles.previewImage} />
            <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={2}>
              {selectedEvidence.fileName}
            </Text>
            <Text style={[styles.previewText, { color: colors.textTertiary }]}>This image uploads on submit.</Text>
          </View>
        ) : null}

        {evidenceUrl ? (
          <Text style={[styles.uploadedText, { color: colors.success }]}>Evidence uploaded and ready.</Text>
        ) : (
          <Text style={[styles.previewText, { color: colors.textTertiary }]}>No evidence uploaded yet.</Text>
        )}

        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any reviewer note"
          multiline
          numberOfLines={4}
          style={styles.multilineInput}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Candidate Tallies</Text>
        {tallies.map((row, index) => (
          <Card key={`${index}-${row.candidateName}`} style={styles.tallyCard}>
            <View style={styles.tallyHeader}>
              <Text style={[styles.tallyTitle, { color: colors.text }]}>Row {index + 1}</Text>
              <Pressable
                onPress={() => removeTallyRow(index)}
                disabled={tallies.length === 1}
                style={{ opacity: tallies.length === 1 ? 0.4 : 1 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
            <Input
              label="Candidate Name"
              value={row.candidateName}
              onChangeText={(text) => updateTally(index, 'candidateName', text)}
              placeholder="Candidate full name"
            />
            <Input
              label="Candidate ID (optional)"
              value={row.candidateId}
              onChangeText={(text) => updateTally(index, 'candidateId', text)}
              placeholder="UUID"
            />
            <Input
              label="Votes"
              value={row.votes}
              onChangeText={(text) => updateTally(index, 'votes', text.replace(/[^0-9]/g, ''))}
              placeholder="0"
              keyboardType="numeric"
            />
          </Card>
        ))}

        <Button
          title="Add Candidate Row"
          onPress={addTallyRow}
          variant="outline"
          icon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} />}
          fullWidth
        />

        <Pressable
          onPress={() => setDeclaration((current) => !current)}
          style={[styles.declarationRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons
            name={declaration ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={declaration ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.declarationText, { color: colors.textSecondary }]}>
            I confirm these are announced official polling-station totals and evidence is attached.
          </Text>
        </Pressable>

        <Button
          title="Submit Result"
          onPress={handleSubmit}
          loading={submitMutation.isPending}
          disabled={!canSubmit || submitMutation.isPending || uploadingEvidence}
          icon={<Ionicons name="cloud-upload" size={18} color={colors.white} />}
          size="lg"
          fullWidth
          style={styles.submitButton}
        />

        {uploadingEvidence && (
          <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>Uploading evidence...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  heading: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
  },
  subheading: {
    fontSize: FontSize.sm,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  queueCard: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  queueMeta: {
    flex: 1,
  },
  queueTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  queueText: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  metaCard: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  metaText: {
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  evidenceActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  evidenceButton: {
    flex: 1,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  previewText: {
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  uploadedText: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  tallyCard: {
    marginBottom: Spacing.md,
  },
  tallyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tallyTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  declarationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  declarationText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  uploadingText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
  },
});
