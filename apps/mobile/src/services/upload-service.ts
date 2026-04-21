import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '@/constants';
import { useAuthStore } from '@/stores/auth-store';

export interface PickedEvidence {
  uri: string;
  mimeType: string;
  fileName: string;
}

function getAuthHeaders() {
  const state = useAuthStore.getState();
  const token = state.getMobileAccessToken();
  const userId = state.profile?.id || state.user?.id;

  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (userId) {
    headers['x-myvote-user-id'] = userId;
  }

  return headers;
}

function toEvidence(asset: ImagePicker.ImagePickerAsset): PickedEvidence {
  const mimeType = asset.mimeType || 'image/jpeg';
  const extension = mimeType.split('/')[1] || 'jpg';
  const fileName = asset.fileName || `result-sheet-${Date.now()}.${extension}`;

  return {
    uri: asset.uri,
    mimeType,
    fileName,
  };
}

export async function pickEvidenceFromGallery(): Promise<PickedEvidence | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Gallery permission is required to pick a result sheet image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return toEvidence(result.assets[0]);
}

export async function captureEvidenceWithCamera(): Promise<PickedEvidence | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to capture a result sheet image.');
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.75,
    allowsEditing: false,
    cameraType: ImagePicker.CameraType.back,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  return toEvidence(result.assets[0]);
}

export async function uploadResultEvidence(evidence: PickedEvidence): Promise<string> {
  const formData = new FormData();

  formData.append('file', {
    uri: evidence.uri,
    name: evidence.fileName,
    type: evidence.mimeType,
  } as any);

  const response = await fetch(`${API_BASE_URL}/api/mobile/uploads/result-sheet`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.url) {
    throw new Error(data?.error || 'Failed to upload result sheet image');
  }

  return data.url as string;
}
