/**
 * Shared domain types for myVote. Mirrors the shape returned by the
 * Next.js API routes in apps/web/src/app/api so the same TypeScript types
 * power the web and mobile clients.
 */

export type ApiElectoralPosition =
  | 'president'
  | 'governor'
  | 'senator'
  | 'women_rep'
  | 'mp'
  | 'mca';

export type ApiUserRole = 'voter' | 'candidate' | 'agent' | 'admin' | 'super_admin' | 'system_admin';

export type ApiGender = 'male' | 'female' | 'prefer_not_to_say';

export type ApiAgeBracket = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface CandidateFields {
  id: string;
  position: ApiElectoralPosition | string;
  party_id: string | null;
  is_independent: boolean;
  campaign_slogan: string | null;
  manifesto_text: string | null;
  manifesto_pdf_url: string | null;
  campaign_video_url: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  is_verified: boolean;
  verification_status: string | null;
}

export interface ProfileData {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string;
  gender: ApiGender | null;
  age_bracket: ApiAgeBracket | null;
  id_number: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  role: ApiUserRole | string;
  is_verified: boolean;
  polling_station_id: string | null;
  ward_id: string | null;
  constituency_id: string | null;
  county_id: string | null;
  polling_station_name: string | null;
  ward_name: string | null;
  constituency_name: string | null;
  county_name: string | null;
  created_at: string;
  updated_at: string;
  candidate?: CandidateFields | null;
}

export interface ProfileCompletion {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  isComplete: boolean;
  requiredFields?: string[];
  optionalFields?: string[];
}

export interface ProfileResponse {
  profile: ProfileData;
  completion: ProfileCompletion;
}

export interface UpdateProfilePayload {
  full_name?: string;
  email?: string | null;
  gender?: ApiGender | null;
  age_bracket?: ApiAgeBracket | null;
  bio?: string | null;
  polling_station_id?: string | null;
}

// ---------------------------------------------------------------------------
// Candidate (public + dashboard)
// ---------------------------------------------------------------------------

export interface CandidatePartySummary {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor?: string;
  secondaryColor?: string;
  symbolUrl?: string;
  leaderName?: string;
  logo_url?: string | null;
  color?: string | null;
}

export interface CandidateListItem {
  id: string;
  user_id: string;
  position: string;
  county_id: string | null;
  constituency_id: string | null;
  ward_id: string | null;
  party_id: string | null;
  is_independent: boolean;
  campaign_slogan: string | null;
  manifesto_text: string | null;
  is_verified: boolean;
  verification_status: string;
  follower_count: number;
  is_active: boolean;
  user: {
    id: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    profile_photo_url: string | null;
    phone: string;
  };
  party?: CandidatePartySummary | null;
}

export interface CandidateDetail {
  id: string;
  name: string;
  position: string;
  positionLabel: string;
  photoUrl?: string;
  bio?: string;
  gender?: string;
  ageBracket?: string;
  party?: CandidatePartySummary;
  isIndependent: boolean;
  isVerified: boolean;
  followerCount: number;
  isFollowing: boolean;
  location: string;
  slogan?: string;
  manifesto?: string;
  manifestoPdfUrl?: string;
  videoUrl?: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
  };
  demographics: {
    total: number;
    byGender: Record<string, number>;
    byAge: Record<string, number>;
  };
  joinedAt: string;
}

export interface CandidateMeResponse {
  candidate: {
    id: string;
    position: string;
    campaign_slogan: string | null;
    manifesto_text: string | null;
    is_verified: boolean;
    verification_status: string;
    is_active: boolean;
    follower_count: number;
    created_at: string;
    user: {
      full_name: string;
      phone: string;
      profile_photo_url: string | null;
    };
    party: { name: string; abbreviation: string } | null;
    county: { name: string } | null;
    constituency: { name: string } | null;
    ward: { name: string } | null;
  };
  stats: {
    followerCount: number;
    agentCount: number;
    activePollCount: number;
    recentVotes: number;
  };
  demographics: {
    gender: Record<string, number>;
    age: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AgentStatus = 'pending' | 'active' | 'suspended' | 'revoked';

export interface AgentData {
  agent_id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  profile_photo_url: string | null;
  assigned_region_type: string;
  region_name: string;
  mpesa_number: string | null;
  status: AgentStatus;
  invited_phone: string | null;
  invited_name: string | null;
  invitation_token: string | null;
  total_reports: number;
  total_results_submitted: number;
  total_payments_received: number;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

export interface InviteAgentPayload {
  userId?: string;
  phone?: string;
  name?: string;
  regionType: string;
  pollingStationId?: string;
  wardId?: string;
  constituencyId?: string;
  countyId?: string;
  mpesaNumber?: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  action_url?: string | null;
  action_label?: string | null;
  metadata?: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export interface WalletSummary {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiWalletTransaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  reference: string | null;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Reports / Results / Messages
// ---------------------------------------------------------------------------

export interface ReportItem {
  id: string;
  reporter_id: string;
  category: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface ResultItem {
  position: string;
  region_name: string;
  region_type: string;
  status: 'live' | 'final' | 'preliminary';
  total_votes: number;
  stations_reported: number;
  total_stations: number;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    party_color: string | null;
    votes: number;
    percentage: number;
    photo_url: string | null;
  }>;
}

export interface MessageItem {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

/** Conversation row returned from /api/messages (list view). */
export interface ConversationItem {
  id: string;
  conversation_type: 'candidate_agent' | 'admin_user' | string;
  candidate_id: string | null;
  agent_id: string | null;
  initiator_user_id: string | null;
  recipient_user_id: string | null;
  subject: string | null;
  is_active: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  candidate_unread_count?: number;
  agent_unread_count?: number;
  initiator_unread_count?: number;
  recipient_unread_count?: number;
  created_at: string;
  candidates?: { id: string; users?: any } | null;
  agents?: { id: string; users?: any } | null;
  initiator?: { id: string; full_name: string; phone?: string; role?: string; avatar_url?: string | null } | null;
  recipient?: { id: string; full_name: string; phone?: string; role?: string; avatar_url?: string | null } | null;
}

/** Single message inside a conversation thread. */
export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: { id: string; full_name: string; role?: string; avatar_url?: string | null } | null;
}

// ---------------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------------

export interface FollowingItem {
  id: string;
  candidate_id: string;
  followed_at: string;
  candidate: CandidateListItem;
}

// ---------------------------------------------------------------------------
// System Settings (shared by web + mobile via /api/settings)
// ---------------------------------------------------------------------------

export interface SystemSettings {
  siteName?: string;
  supportPhone?: string;
  whatsappPhone?: string;
  ussdCode?: string;
  supportEmail?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  maintenanceMode?: boolean;
  registrationOpen?: boolean;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  siteName: 'myVote Kenya',
  supportPhone: '+254 733 638 940',
  whatsappPhone: '+254 733 638 940',
  ussdCode: '*384*VOTE#',
  supportEmail: 'support@keyvote.online',
  facebookUrl: 'https://facebook.com/myvotekenya',
  instagramUrl: 'https://instagram.com/myvotekenya',
  tiktokUrl: 'https://tiktok.com/@myvotekenya',
};
