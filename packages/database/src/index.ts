// Database Types
export * from './types/database.types';

// Supabase Client
export * from './client';

// Re-export common types for convenience
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  // Enum types
  AgeBracket,
  AgentStatus,
  ElectoralPosition,
  GenderType,
  PollStatus,
  RegionType,
  TransactionStatus,
  TransactionType,
  UserRole,
  VerificationStatus,
  // Table types
  User,
  Candidate,
  County,
  Constituency,
  Ward,
  PollingStation,
  PoliticalParty,
  Poll,
  Follower,
  Agent,
  Wallet,
  // Extended types
  CandidateWithUser,
  UserWithLocation,
  PollingStationWithHierarchy,
} from './types/database.types';
