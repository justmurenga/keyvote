"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterCandidatesSchema = exports.searchSchema = exports.paginationSchema = exports.mpesaCallbackSchema = exports.walletTransactionSchema = exports.sendMessageSchema = exports.agentInvitationSchema = exports.REGION_TYPES = exports.agentAssignmentSchema = exports.electionResultSchema = exports.POLL_STATUSES = exports.pollVoteSchema = exports.createPollSchema = exports.candidateProfileSchema = exports.userLoginSchema = exports.userRegistrationSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("./constants");
/**
 * User Registration Schema
 */
exports.userRegistrationSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
        .transform((val) => val.startsWith('0') ? `+254${val.slice(1)}` : val),
    id_number: zod_1.z
        .string()
        .min(7, 'ID number must be at least 7 characters')
        .max(10, 'ID number must be at most 10 characters'),
    full_name: zod_1.z.string().min(2, 'Full name is required').max(200),
    gender: zod_1.z.enum(constants_1.GENDERS).optional(),
    age_bracket: zod_1.z.enum(constants_1.AGE_BRACKETS).optional(),
    polling_station_id: zod_1.z.string().uuid().optional(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
/**
 * User Login Schema
 */
exports.userLoginSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
        .transform((val) => val.startsWith('0') ? `+254${val.slice(1)}` : val),
    password: zod_1.z.string().min(1, 'Password is required'),
});
/**
 * Candidate Profile Schema
 */
exports.candidateProfileSchema = zod_1.z.object({
    position: zod_1.z.enum(constants_1.ELECTORAL_POSITIONS),
    party: zod_1.z.string().min(2, 'Party name is required').max(100),
    manifesto: zod_1.z.string().max(5000).optional(),
    bio: zod_1.z.string().max(2000).optional(),
    photo_url: zod_1.z.string().url().optional(),
    // Electoral area based on position
    county_id: zod_1.z.string().uuid().optional(),
    constituency_id: zod_1.z.string().uuid().optional(),
    ward_id: zod_1.z.string().uuid().optional(),
});
/**
 * Poll Creation Schema (matches DB polls table)
 */
exports.createPollSchema = zod_1.z.object({
    title: zod_1.z.string().min(10, 'Title must be at least 10 characters').max(200),
    description: zod_1.z.string().max(2000).optional(),
    position: zod_1.z.enum(constants_1.ELECTORAL_POSITIONS),
    county_id: zod_1.z.string().uuid().optional().nullable(),
    constituency_id: zod_1.z.string().uuid().optional().nullable(),
    ward_id: zod_1.z.string().uuid().optional().nullable(),
    start_time: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().min(1)),
    end_time: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().min(1)),
    is_party_nomination: zod_1.z.boolean().default(false),
    party_id: zod_1.z.string().uuid().optional().nullable(),
    status: zod_1.z.enum(['draft', 'scheduled', 'active']).default('draft'),
});
/**
 * Poll Vote Schema (matches DB poll_votes table)
 */
exports.pollVoteSchema = zod_1.z.object({
    poll_id: zod_1.z.string().uuid(),
    candidate_id: zod_1.z.string().uuid(),
});
/**
 * Poll Status values
 */
exports.POLL_STATUSES = ['draft', 'scheduled', 'active', 'completed', 'cancelled'];
/**
 * Election Result Entry Schema
 */
exports.electionResultSchema = zod_1.z.object({
    candidate_id: zod_1.z.string().uuid(),
    polling_station_id: zod_1.z.string().uuid(),
    position: zod_1.z.enum(constants_1.ELECTORAL_POSITIONS),
    votes: zod_1.z.number().int().min(0),
    rejected_votes: zod_1.z.number().int().min(0).optional(),
    spoilt_votes: zod_1.z.number().int().min(0).optional(),
    photo_url: zod_1.z.string().url().optional(),
});
/**
 * Agent Assignment Schema
 */
exports.agentAssignmentSchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid(),
    polling_station_id: zod_1.z.string().uuid(),
    position: zod_1.z.enum(constants_1.ELECTORAL_POSITIONS),
});
/**
 * Agent Invitation Schema
 */
exports.REGION_TYPES = ['national', 'county', 'constituency', 'ward', 'polling_station'];
exports.agentInvitationSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
        .transform((val) => val.startsWith('0') ? `+254${val.slice(1)}` : val),
    name: zod_1.z.string().min(2, 'Full name is required').max(200),
    regionType: zod_1.z.enum(exports.REGION_TYPES),
    pollingStationId: zod_1.z.string().uuid().optional(),
    wardId: zod_1.z.string().uuid().optional(),
    constituencyId: zod_1.z.string().uuid().optional(),
    countyId: zod_1.z.string().uuid().optional(),
    mpesaNumber: zod_1.z
        .string()
        .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number')
        .optional(),
}).refine((data) => {
    if (data.regionType === 'polling_station')
        return !!data.pollingStationId;
    if (data.regionType === 'ward')
        return !!data.wardId;
    if (data.regionType === 'constituency')
        return !!data.constituencyId;
    if (data.regionType === 'county')
        return !!data.countyId;
    return true; // national doesn't need a specific ID
}, {
    message: 'A region ID is required for the selected region type',
});
/**
 * Message Schema
 */
exports.sendMessageSchema = zod_1.z.object({
    recipient_id: zod_1.z.string().uuid(),
    channel: zod_1.z.enum(constants_1.MESSAGE_CHANNELS),
    subject: zod_1.z.string().max(200).optional(),
    body: zod_1.z.string().min(1).max(1600),
    scheduled_at: zod_1.z.string().datetime().optional(),
});
/**
 * Wallet Transaction Schema
 */
exports.walletTransactionSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be positive'),
    type: zod_1.z.enum(['credit', 'debit']),
    description: zod_1.z.string().max(500).optional(),
    reference: zod_1.z.string().max(100).optional(),
});
/**
 * M-Pesa Callback Schema
 */
exports.mpesaCallbackSchema = zod_1.z.object({
    ResultCode: zod_1.z.number(),
    ResultDesc: zod_1.z.string(),
    MerchantRequestID: zod_1.z.string(),
    CheckoutRequestID: zod_1.z.string(),
    CallbackMetadata: zod_1.z
        .object({
        Item: zod_1.z.array(zod_1.z.object({
            Name: zod_1.z.string(),
            Value: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
        })),
    })
        .optional(),
});
/**
 * Pagination Schema
 */
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
/**
 * Search Schema
 */
exports.searchSchema = zod_1.z.object({
    q: zod_1.z.string().min(1).max(100),
    type: zod_1.z.enum(['candidates', 'polls', 'users', 'all']).default('all'),
    position: zod_1.z.enum(constants_1.ELECTORAL_POSITIONS).optional(),
    county_id: zod_1.z.string().uuid().optional(),
    constituency_id: zod_1.z.string().uuid().optional(),
    ward_id: zod_1.z.string().uuid().optional(),
}).merge(exports.paginationSchema);
/**
 * Filter Candidates Schema
 */
exports.filterCandidatesSchema = zod_1.z.object({
    position: zod_1.z.enum(constants_1.ELECTORAL_POSITIONS).optional(),
    county_id: zod_1.z.string().uuid().optional(),
    constituency_id: zod_1.z.string().uuid().optional(),
    ward_id: zod_1.z.string().uuid().optional(),
    party: zod_1.z.string().optional(),
    is_verified: zod_1.z.boolean().optional(),
}).merge(exports.paginationSchema);
//# sourceMappingURL=schemas.js.map