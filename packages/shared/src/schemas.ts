import { z } from 'zod';
import { ELECTORAL_POSITIONS, USER_ROLES, AGE_BRACKETS, GENDERS, MESSAGE_CHANNELS } from './constants';

/**
 * User Registration Schema
 */
export const userRegistrationSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
    .transform((val) => val.startsWith('0') ? `+254${val.slice(1)}` : val),
  id_number: z
    .string()
    .min(7, 'ID number must be at least 7 characters')
    .max(10, 'ID number must be at most 10 characters'),
  full_name: z.string().min(2, 'Full name is required').max(200),
  gender: z.enum(GENDERS).optional(),
  age_bracket: z.enum(AGE_BRACKETS).optional(),
  polling_station_id: z.string().uuid().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;

/**
 * User Login Schema
 */
export const userLoginSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
    .transform((val) => val.startsWith('0') ? `+254${val.slice(1)}` : val),
  password: z.string().min(1, 'Password is required'),
});

export type UserLogin = z.infer<typeof userLoginSchema>;

/**
 * Candidate Profile Schema
 */
export const candidateProfileSchema = z.object({
  position: z.enum(ELECTORAL_POSITIONS),
  party: z.string().min(2, 'Party name is required').max(100),
  manifesto: z.string().max(5000).optional(),
  bio: z.string().max(2000).optional(),
  photo_url: z.string().url().optional(),
  // Electoral area based on position
  county_id: z.string().uuid().optional(),
  constituency_id: z.string().uuid().optional(),
  ward_id: z.string().uuid().optional(),
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

/**
 * Poll Creation Schema (matches DB polls table)
 */
export const createPollSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200),
  description: z.string().max(2000).optional(),
  position: z.enum(ELECTORAL_POSITIONS),
  county_id: z.string().uuid().optional().nullable(),
  constituency_id: z.string().uuid().optional().nullable(),
  ward_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime({ offset: true }).or(z.string().min(1)),
  end_time: z.string().datetime({ offset: true }).or(z.string().min(1)),
  is_party_nomination: z.boolean().default(false),
  party_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'active']).default('draft'),
});

export type CreatePoll = z.infer<typeof createPollSchema>;

/**
 * Poll Vote Schema (matches DB poll_votes table)
 */
export const pollVoteSchema = z.object({
  poll_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
});

export type PollVote = z.infer<typeof pollVoteSchema>;

/**
 * Poll Status values
 */
export const POLL_STATUSES = ['draft', 'scheduled', 'active', 'completed', 'cancelled'] as const;
export type PollStatus = (typeof POLL_STATUSES)[number];

/**
 * Election Result Entry Schema
 */
export const electionResultSchema = z.object({
  candidate_id: z.string().uuid(),
  polling_station_id: z.string().uuid(),
  position: z.enum(ELECTORAL_POSITIONS),
  votes: z.number().int().min(0),
  rejected_votes: z.number().int().min(0).optional(),
  spoilt_votes: z.number().int().min(0).optional(),
  photo_url: z.string().url().optional(),
});

export type ElectionResult = z.infer<typeof electionResultSchema>;

/**
 * Agent Assignment Schema
 */
export const agentAssignmentSchema = z.object({
  user_id: z.string().uuid(),
  polling_station_id: z.string().uuid(),
  position: z.enum(ELECTORAL_POSITIONS),
});

export type AgentAssignment = z.infer<typeof agentAssignmentSchema>;

/**
 * Agent Invitation Schema
 */
export const REGION_TYPES = ['national', 'county', 'constituency', 'ward', 'polling_station'] as const;
export type RegionType = (typeof REGION_TYPES)[number];

export const agentInvitationSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
    .transform((val) => val.startsWith('0') ? `+254${val.slice(1)}` : val),
  name: z.string().min(2, 'Full name is required').max(200),
  regionType: z.enum(REGION_TYPES),
  pollingStationId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
  constituencyId: z.string().uuid().optional(),
  countyId: z.string().uuid().optional(),
  mpesaNumber: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
    .optional(),
}).refine((data) => {
  if (data.regionType === 'polling_station') return !!data.pollingStationId;
  if (data.regionType === 'ward') return !!data.wardId;
  if (data.regionType === 'constituency') return !!data.constituencyId;
  if (data.regionType === 'county') return !!data.countyId;
  return true; // national doesn't need a specific ID
}, {
  message: 'A region ID is required for the selected region type',
});

export type AgentInvitation = z.infer<typeof agentInvitationSchema>;

/**
 * Message Schema
 */
export const sendMessageSchema = z.object({
  recipient_id: z.string().uuid(),
  channel: z.enum(MESSAGE_CHANNELS),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(1600),
  scheduled_at: z.string().datetime().optional(),
});

export type SendMessage = z.infer<typeof sendMessageSchema>;

/**
 * Wallet Transaction Schema
 */
export const walletTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['credit', 'debit']),
  description: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
});

export type WalletTransaction = z.infer<typeof walletTransactionSchema>;

/**
 * M-Pesa Callback Schema
 */
export const mpesaCallbackSchema = z.object({
  ResultCode: z.number(),
  ResultDesc: z.string(),
  MerchantRequestID: z.string(),
  CheckoutRequestID: z.string(),
  CallbackMetadata: z
    .object({
      Item: z.array(
        z.object({
          Name: z.string(),
          Value: z.union([z.string(), z.number()]).optional(),
        })
      ),
    })
    .optional(),
});

export type MpesaCallback = z.infer<typeof mpesaCallbackSchema>;

/**
 * Pagination Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * Search Schema
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(['candidates', 'polls', 'users', 'all']).default('all'),
  position: z.enum(ELECTORAL_POSITIONS).optional(),
  county_id: z.string().uuid().optional(),
  constituency_id: z.string().uuid().optional(),
  ward_id: z.string().uuid().optional(),
}).merge(paginationSchema);

export type SearchParams = z.infer<typeof searchSchema>;

/**
 * Filter Candidates Schema
 */
export const filterCandidatesSchema = z.object({
  position: z.enum(ELECTORAL_POSITIONS).optional(),
  county_id: z.string().uuid().optional(),
  constituency_id: z.string().uuid().optional(),
  ward_id: z.string().uuid().optional(),
  party: z.string().optional(),
  is_verified: z.boolean().optional(),
}).merge(paginationSchema);

export type FilterCandidates = z.infer<typeof filterCandidatesSchema>;
