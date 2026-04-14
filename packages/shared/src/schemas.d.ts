import { z } from 'zod';
/**
 * User Registration Schema
 */
export declare const userRegistrationSchema: z.ZodObject<{
    phone: z.ZodEffects<z.ZodString, string, string>;
    id_number: z.ZodString;
    first_name: z.ZodString;
    last_name: z.ZodString;
    gender: z.ZodOptional<z.ZodEnum<["male", "female", "other"]>>;
    age_bracket: z.ZodOptional<z.ZodEnum<["18-25", "26-35", "36-45", "46-60", "60+"]>>;
    polling_station_id: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    id_number: string;
    first_name: string;
    last_name: string;
    password: string;
    gender?: "male" | "female" | "other" | undefined;
    age_bracket?: "18-25" | "26-35" | "36-45" | "46-60" | "60+" | undefined;
    polling_station_id?: string | undefined;
}, {
    phone: string;
    id_number: string;
    first_name: string;
    last_name: string;
    password: string;
    gender?: "male" | "female" | "other" | undefined;
    age_bracket?: "18-25" | "26-35" | "36-45" | "46-60" | "60+" | undefined;
    polling_station_id?: string | undefined;
}>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
/**
 * User Login Schema
 */
export declare const userLoginSchema: z.ZodObject<{
    phone: z.ZodEffects<z.ZodString, string, string>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    password: string;
}, {
    phone: string;
    password: string;
}>;
export type UserLogin = z.infer<typeof userLoginSchema>;
/**
 * Candidate Profile Schema
 */
export declare const candidateProfileSchema: z.ZodObject<{
    position: z.ZodEnum<["president", "governor", "senator", "women_rep", "mp", "mca"]>;
    party: z.ZodString;
    manifesto: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    photo_url: z.ZodOptional<z.ZodString>;
    county_id: z.ZodOptional<z.ZodString>;
    constituency_id: z.ZodOptional<z.ZodString>;
    ward_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    party: string;
    manifesto?: string | undefined;
    bio?: string | undefined;
    photo_url?: string | undefined;
    county_id?: string | undefined;
    constituency_id?: string | undefined;
    ward_id?: string | undefined;
}, {
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    party: string;
    manifesto?: string | undefined;
    bio?: string | undefined;
    photo_url?: string | undefined;
    county_id?: string | undefined;
    constituency_id?: string | undefined;
    ward_id?: string | undefined;
}>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
/**
 * Poll Creation Schema (matches DB polls table)
 */
export declare const createPollSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    position: z.ZodEnum<["president", "governor", "senator", "women_rep", "mp", "mca"]>;
    county_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    constituency_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    ward_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    start_time: z.ZodUnion<[z.ZodString, z.ZodString]>;
    end_time: z.ZodUnion<[z.ZodString, z.ZodString]>;
    is_party_nomination: z.ZodDefault<z.ZodBoolean>;
    party_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["draft", "scheduled", "active"]>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "scheduled" | "active";
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    title: string;
    start_time: string;
    end_time: string;
    is_party_nomination: boolean;
    county_id?: string | null | undefined;
    constituency_id?: string | null | undefined;
    ward_id?: string | null | undefined;
    description?: string | undefined;
    party_id?: string | null | undefined;
}, {
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    title: string;
    start_time: string;
    end_time: string;
    status?: "draft" | "scheduled" | "active" | undefined;
    county_id?: string | null | undefined;
    constituency_id?: string | null | undefined;
    ward_id?: string | null | undefined;
    description?: string | undefined;
    is_party_nomination?: boolean | undefined;
    party_id?: string | null | undefined;
}>;
export type CreatePoll = z.infer<typeof createPollSchema>;
/**
 * Poll Vote Schema (matches DB poll_votes table)
 */
export declare const pollVoteSchema: z.ZodObject<{
    poll_id: z.ZodString;
    candidate_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    poll_id: string;
    candidate_id: string;
}, {
    poll_id: string;
    candidate_id: string;
}>;
export type PollVote = z.infer<typeof pollVoteSchema>;
/**
 * Poll Status values
 */
export declare const POLL_STATUSES: readonly ["draft", "scheduled", "active", "completed", "cancelled"];
export type PollStatus = (typeof POLL_STATUSES)[number];
/**
 * Election Result Entry Schema
 */
export declare const electionResultSchema: z.ZodObject<{
    candidate_id: z.ZodString;
    polling_station_id: z.ZodString;
    position: z.ZodEnum<["president", "governor", "senator", "women_rep", "mp", "mca"]>;
    votes: z.ZodNumber;
    rejected_votes: z.ZodOptional<z.ZodNumber>;
    spoilt_votes: z.ZodOptional<z.ZodNumber>;
    photo_url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    polling_station_id: string;
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    candidate_id: string;
    votes: number;
    photo_url?: string | undefined;
    rejected_votes?: number | undefined;
    spoilt_votes?: number | undefined;
}, {
    polling_station_id: string;
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    candidate_id: string;
    votes: number;
    photo_url?: string | undefined;
    rejected_votes?: number | undefined;
    spoilt_votes?: number | undefined;
}>;
export type ElectionResult = z.infer<typeof electionResultSchema>;
/**
 * Agent Assignment Schema
 */
export declare const agentAssignmentSchema: z.ZodObject<{
    user_id: z.ZodString;
    polling_station_id: z.ZodString;
    position: z.ZodEnum<["president", "governor", "senator", "women_rep", "mp", "mca"]>;
}, "strip", z.ZodTypeAny, {
    polling_station_id: string;
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    user_id: string;
}, {
    polling_station_id: string;
    position: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca";
    user_id: string;
}>;
export type AgentAssignment = z.infer<typeof agentAssignmentSchema>;
/**
 * Message Schema
 */
export declare const sendMessageSchema: z.ZodObject<{
    recipient_id: z.ZodString;
    channel: z.ZodEnum<["sms", "whatsapp", "push", "email"]>;
    subject: z.ZodOptional<z.ZodString>;
    body: z.ZodString;
    scheduled_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    recipient_id: string;
    channel: "sms" | "whatsapp" | "push" | "email";
    body: string;
    subject?: string | undefined;
    scheduled_at?: string | undefined;
}, {
    recipient_id: string;
    channel: "sms" | "whatsapp" | "push" | "email";
    body: string;
    subject?: string | undefined;
    scheduled_at?: string | undefined;
}>;
export type SendMessage = z.infer<typeof sendMessageSchema>;
/**
 * Wallet Transaction Schema
 */
export declare const walletTransactionSchema: z.ZodObject<{
    amount: z.ZodNumber;
    type: z.ZodEnum<["credit", "debit"]>;
    description: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "credit" | "debit";
    amount: number;
    description?: string | undefined;
    reference?: string | undefined;
}, {
    type: "credit" | "debit";
    amount: number;
    description?: string | undefined;
    reference?: string | undefined;
}>;
export type WalletTransaction = z.infer<typeof walletTransactionSchema>;
/**
 * M-Pesa Callback Schema
 */
export declare const mpesaCallbackSchema: z.ZodObject<{
    ResultCode: z.ZodNumber;
    ResultDesc: z.ZodString;
    MerchantRequestID: z.ZodString;
    CheckoutRequestID: z.ZodString;
    CallbackMetadata: z.ZodOptional<z.ZodObject<{
        Item: z.ZodArray<z.ZodObject<{
            Name: z.ZodString;
            Value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        }, "strip", z.ZodTypeAny, {
            Name: string;
            Value?: string | number | undefined;
        }, {
            Name: string;
            Value?: string | number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        Item: {
            Name: string;
            Value?: string | number | undefined;
        }[];
    }, {
        Item: {
            Name: string;
            Value?: string | number | undefined;
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    ResultCode: number;
    ResultDesc: string;
    MerchantRequestID: string;
    CheckoutRequestID: string;
    CallbackMetadata?: {
        Item: {
            Name: string;
            Value?: string | number | undefined;
        }[];
    } | undefined;
}, {
    ResultCode: number;
    ResultDesc: string;
    MerchantRequestID: string;
    CheckoutRequestID: string;
    CallbackMetadata?: {
        Item: {
            Name: string;
            Value?: string | number | undefined;
        }[];
    } | undefined;
}>;
export type MpesaCallback = z.infer<typeof mpesaCallbackSchema>;
/**
 * Pagination Schema
 */
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type Pagination = z.infer<typeof paginationSchema>;
/**
 * Search Schema
 */
export declare const searchSchema: z.ZodObject<{
    q: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["candidates", "polls", "users", "all"]>>;
    position: z.ZodOptional<z.ZodEnum<["president", "governor", "senator", "women_rep", "mp", "mca"]>>;
    county_id: z.ZodOptional<z.ZodString>;
    constituency_id: z.ZodOptional<z.ZodString>;
    ward_id: z.ZodOptional<z.ZodString>;
} & {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "candidates" | "polls" | "users" | "all";
    page: number;
    limit: number;
    q: string;
    position?: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca" | undefined;
    county_id?: string | undefined;
    constituency_id?: string | undefined;
    ward_id?: string | undefined;
}, {
    q: string;
    type?: "candidates" | "polls" | "users" | "all" | undefined;
    position?: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca" | undefined;
    county_id?: string | undefined;
    constituency_id?: string | undefined;
    ward_id?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type SearchParams = z.infer<typeof searchSchema>;
/**
 * Filter Candidates Schema
 */
export declare const filterCandidatesSchema: z.ZodObject<{
    position: z.ZodOptional<z.ZodEnum<["president", "governor", "senator", "women_rep", "mp", "mca"]>>;
    county_id: z.ZodOptional<z.ZodString>;
    constituency_id: z.ZodOptional<z.ZodString>;
    ward_id: z.ZodOptional<z.ZodString>;
    party: z.ZodOptional<z.ZodString>;
    is_verified: z.ZodOptional<z.ZodBoolean>;
} & {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    position?: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca" | undefined;
    party?: string | undefined;
    county_id?: string | undefined;
    constituency_id?: string | undefined;
    ward_id?: string | undefined;
    is_verified?: boolean | undefined;
}, {
    position?: "president" | "governor" | "senator" | "women_rep" | "mp" | "mca" | undefined;
    party?: string | undefined;
    county_id?: string | undefined;
    constituency_id?: string | undefined;
    ward_id?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    is_verified?: boolean | undefined;
}>;
export type FilterCandidates = z.infer<typeof filterCandidatesSchema>;
//# sourceMappingURL=schemas.d.ts.map