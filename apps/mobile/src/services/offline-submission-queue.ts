import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  submitPollingStationResult,
  type ElectionDaySubmissionPayload,
} from '@/services/api';
import { uploadResultEvidence } from '@/services/upload-service';

function inferMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export interface QueuedSubmission {
  id: string;
  createdAt: string;
  lastError?: string;
  payload: ElectionDaySubmissionPayload;
}

const QUEUE_KEY = 'myvote-offline-result-queue';

async function readQueue(): Promise<QueuedSubmission[]> {
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedSubmission[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueuedSubmissions(): Promise<QueuedSubmission[]> {
  return readQueue();
}

export async function enqueueSubmission(
  payload: ElectionDaySubmissionPayload,
  lastError?: string
): Promise<QueuedSubmission> {
  const queue = await readQueue();
  const item: QueuedSubmission = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    lastError,
    payload,
  };

  queue.unshift(item);
  await writeQueue(queue);
  return item;
}

export async function removeQueuedSubmission(id: string) {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== id));
}

export async function retryQueuedSubmissions() {
  const connection = await NetInfo.fetch();
  if (!connection.isConnected) {
    return { synced: 0, failed: 0, skipped: true };
  }

  const queue = await readQueue();
  let synced = 0;
  let failed = 0;
  const remaining: QueuedSubmission[] = [];

  for (const item of queue) {
    try {
      const payload = { ...item.payload };

      if (payload.evidence_url.startsWith('file://')) {
        const remoteUrl = await uploadResultEvidence({
          uri: payload.evidence_url,
          mimeType: inferMimeType(payload.evidence_url),
          fileName: `queued-result-sheet-${Date.now()}.jpg`,
        });
        payload.evidence_url = remoteUrl;
      }

      await submitPollingStationResult(payload);
      synced += 1;
    } catch (error: any) {
      failed += 1;
      remaining.push({
        ...item,
        lastError: error?.message || 'Sync failed',
      });
    }
  }

  await writeQueue(remaining);
  return { synced, failed, skipped: false };
}
