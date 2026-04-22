/**
 * Mobile-side API client.
 *
 * Wraps the shared `@myvote/shared` ApiClient so every screen calls the
 * same Next.js routes the web app uses. Auth is injected from
 * `useAuthStore` (mobile bearer token) so the routes resolve the user via
 * `resolveUserId` on the server side.
 */
import { configureApiClient, apiClient } from '@myvote/shared';
import { API_BASE_URL } from '@/constants';
import { useAuthStore } from '@/stores/auth-store';

let isConfigured = false;

export function ensureApiClientConfigured() {
  if (isConfigured) return;
  isConfigured = true;
  configureApiClient({
    baseUrl: API_BASE_URL,
    credentials: 'omit',
    getAuthToken: () => useAuthStore.getState().mobileAccessToken,
    getDevUserId: () => {
      const state = useAuthStore.getState();
      return state.profile?.id || state.user?.id || null;
    },
  });
}

// Configure on first import so all subsequent api calls work.
ensureApiClientConfigured();

export { apiClient };
export {
  myVoteApi,
  profileApi,
  candidatesApi,
  agentsApi,
  notificationsApi,
  walletApi,
  reportsApi,
  resultsApi,
  messagesApi,
  followingApi,
  settingsApi,
  ApiError,
} from '@myvote/shared';

export type {
  ProfileData,
  ProfileResponse,
  ProfileCompletion,
  UpdateProfilePayload,
  CandidateListItem,
  CandidateDetail,
  CandidateMeResponse,
  CandidatePartySummary,
  AgentData,
  AgentStatus,
  InviteAgentPayload,
  NotificationItem,
  WalletSummary,
  ApiWalletTransaction,
  ReportItem,
  ResultItem,
  MessageItem,
  ConversationItem,
  ConversationMessage,
  FollowingItem,
  SystemSettings,
} from '@myvote/shared';

export { DEFAULT_SYSTEM_SETTINGS } from '@myvote/shared';
