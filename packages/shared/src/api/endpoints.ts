import { apiClient, ApiClient } from './client';
import type {
  ProfileResponse,
  UpdateProfilePayload,
  CandidateListItem,
  CandidateDetail,
  CandidateMeResponse,
  AgentData,
  InviteAgentPayload,
  NotificationItem,
  WalletSummary,
  ApiWalletTransaction,
  ReportItem,
  ResultItem,
  MessageItem,
  FollowingItem,
} from './types';

/**
 * Endpoint helpers — one function per HTTP route, typed against the response
 * shapes used by the web app. Both web and mobile call these so they cannot
 * drift apart.
 *
 * Each helper accepts an optional `client` parameter so callers can pass a
 * scoped client (e.g. with a different bearer token), but the singleton
 * `apiClient` is used by default.
 */

const c = (client?: ApiClient) => client || apiClient;

// ---------------------------------------------------------------------------
// Profile (voter + candidate self)
// ---------------------------------------------------------------------------

export const profileApi = {
  get: (client?: ApiClient) => c(client).get<ProfileResponse>('/api/profile'),

  update: (payload: UpdateProfilePayload, client?: ApiClient) =>
    c(client).patch<{ success: boolean; profile: ProfileResponse['profile'] }>(
      '/api/profile',
      payload,
    ),

  uploadPhoto: (formData: FormData, client?: ApiClient) =>
    c(client).post<{ success: boolean; profile_photo_url: string }>(
      '/api/profile/photo',
      formData,
    ),

  removePhoto: (client?: ApiClient) =>
    c(client).delete<{ success: boolean }>('/api/profile/photo'),

  // Phone verification flow
  sendPhoneOtp: (phone: string, client?: ApiClient) =>
    c(client).post<{ success: boolean; devOtp?: string }>(
      '/api/profile/phone/send-otp',
      { phone },
    ),
  verifyPhoneOtp: (phone: string, otp: string, client?: ApiClient) =>
    c(client).post<{ success: boolean }>('/api/profile/phone/verify-otp', {
      phone,
      otp,
    }),

  // Email verification flow
  sendEmailOtp: (email: string, client?: ApiClient) =>
    c(client).post<{ success: boolean }>('/api/profile/email/send-otp', { email }),
  verifyEmailOtp: (email: string, otp: string, client?: ApiClient) =>
    c(client).post<{ success: boolean }>('/api/profile/email/verify-otp', {
      email,
      otp,
    }),
};

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export const candidatesApi = {
  list: (
    params: { position?: string; search?: string; page?: number; limit?: number } = {},
    client?: ApiClient,
  ) =>
    c(client).get<{ candidates: CandidateListItem[]; total: number }>(
      '/api/candidates',
      { query: params as any },
    ),

  byId: (id: string, client?: ApiClient) =>
    c(client).get<CandidateDetail>(`/api/candidates/${id}`),

  /** Returns the dashboard summary for the candidate logged in. */
  me: (client?: ApiClient) =>
    c(client).get<CandidateMeResponse>('/api/candidates/me'),

  follow: (id: string, client?: ApiClient) =>
    c(client).post<{ success: boolean; isFollowing: boolean }>(
      `/api/candidates/${id}/follow`,
    ),
  unfollow: (id: string, client?: ApiClient) =>
    c(client).delete<{ success: boolean; isFollowing: boolean }>(
      `/api/candidates/${id}/follow`,
    ),

  apply: (payload: Record<string, any>, client?: ApiClient) =>
    c(client).post<{ success: boolean; candidate: any }>(
      '/api/candidates/apply',
      payload,
    ),
};

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const agentsApi = {
  list: (status?: string, client?: ApiClient) =>
    c(client).get<{ agents: AgentData[]; candidateId?: string }>('/api/agents', {
      query: status ? { status } : undefined,
    }),

  invite: (payload: InviteAgentPayload, client?: ApiClient) =>
    c(client).post<{
      success: boolean;
      agent: AgentData;
      acceptUrl: string;
      notified: boolean;
    }>('/api/agents', payload),

  update: (id: string, data: Record<string, any>, client?: ApiClient) =>
    c(client).patch<{ success: boolean }>(`/api/agents/${id}`, data),

  revoke: (id: string, reason?: string, client?: ApiClient) =>
    c(client).post<{ success: boolean }>(`/api/agents/${id}/revoke`, { reason }),

  remove: (id: string, client?: ApiClient) =>
    c(client).delete<{ success: boolean }>(`/api/agents/${id}`),

  acceptInvitation: (token: string, client?: ApiClient) =>
    c(client).post<{ success: boolean; agent: AgentData }>(
      `/api/agents/invitation/${token}/accept`,
    ),

  invitationDetails: (token: string, client?: ApiClient) =>
    c(client).get<{ agent: AgentData; candidate: any }>(
      `/api/agents/invitation/${token}`,
    ),
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationsApi = {
  list: (params: { unreadOnly?: boolean; limit?: number } = {}, client?: ApiClient) =>
    c(client).get<{ notifications: NotificationItem[]; unreadCount: number }>(
      '/api/notifications',
      { query: params as any },
    ),

  markRead: (id: string, client?: ApiClient) =>
    c(client).patch<{ success: boolean }>(`/api/notifications/${id}/read`),

  markAllRead: (client?: ApiClient) =>
    c(client).post<{ success: boolean }>('/api/notifications/mark-all-read'),
};

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export const walletApi = {
  summary: (client?: ApiClient) =>
    c(client).get<{ wallet: WalletSummary }>('/api/wallet'),

  transactions: (
    params: { limit?: number; offset?: number; type?: string } = {},
    client?: ApiClient,
  ) =>
    c(client).get<{ transactions: ApiWalletTransaction[]; total: number }>(
      '/api/wallet/transactions',
      { query: params as any },
    ),

  topup: (amount: number, phone?: string, client?: ApiClient) =>
    c(client).post<{ success: boolean; checkoutRequestId?: string }>(
      '/api/wallet/topup',
      { amount, phone },
    ),

  topupStatus: (id: string, client?: ApiClient) =>
    c(client).get<{ status: string }>('/api/wallet/topup/status', {
      query: { id },
    }),

  withdraw: (amount: number, phone?: string, client?: ApiClient) =>
    c(client).post<{ success: boolean }>('/api/wallet/withdraw', {
      amount,
      phone,
    }),

  transfer: (
    payload: { amount: number; recipient: string; note?: string },
    client?: ApiClient,
  ) => c(client).post<{ success: boolean }>('/api/wallet/transfer', payload),

  statistics: (client?: ApiClient) =>
    c(client).get<{
      totalIn: number;
      totalOut: number;
      monthly: Array<{ month: string; amount: number }>;
    }>('/api/wallet/statistics'),

  entitlements: (client?: ApiClient) =>
    c(client).get<{ entitlements: Record<string, any> }>(
      '/api/wallet/entitlements',
    ),
};

// ---------------------------------------------------------------------------
// Reports / Results / Messages / Following
// ---------------------------------------------------------------------------

export const reportsApi = {
  list: (params: { category?: string; status?: string } = {}, client?: ApiClient) =>
    c(client).get<{ reports: ReportItem[] }>('/api/reports', { query: params as any }),
  create: (payload: Partial<ReportItem>, client?: ApiClient) =>
    c(client).post<{ success: boolean; report: ReportItem }>('/api/reports', payload),
  byId: (id: string, client?: ApiClient) =>
    c(client).get<{ report: ReportItem }>(`/api/reports/${id}`),
};

export const resultsApi = {
  list: (params: { position?: string; region_type?: string } = {}, client?: ApiClient) =>
    c(client).get<{ results: ResultItem[] }>('/api/results', { query: params as any }),
};

export const messagesApi = {
  list: (params: { peerId?: string } = {}, client?: ApiClient) =>
    c(client).get<{ messages: MessageItem[] }>('/api/messages', { query: params as any }),
  send: (payload: { recipient_id: string; body: string }, client?: ApiClient) =>
    c(client).post<{ success: boolean; message: MessageItem }>('/api/messages', payload),
  markRead: (id: string, client?: ApiClient) =>
    c(client).patch<{ success: boolean }>(`/api/messages/${id}/read`),
};

export const followingApi = {
  list: (client?: ApiClient) =>
    c(client).get<{ following: FollowingItem[] }>('/api/following'),
};

// ---------------------------------------------------------------------------
// Bundle export
// ---------------------------------------------------------------------------

export const myVoteApi = {
  profile: profileApi,
  candidates: candidatesApi,
  agents: agentsApi,
  notifications: notificationsApi,
  wallet: walletApi,
  reports: reportsApi,
  results: resultsApi,
  messages: messagesApi,
  following: followingApi,
};
